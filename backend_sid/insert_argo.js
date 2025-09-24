const fs = require('fs');
const path = require('path');
const netcdfjs = require('netcdfjs');
const client = require('./database/db');

// Allow custom root via CLI: node insert_argo.js --dir "C:\\path\\to\\nc-folder" or first positional arg
const defaultRoot = path.join(__dirname, 'Argo data');
const argv = process.argv.slice(2);
let cliRoot = null;
const dirIdx = argv.indexOf('--dir');
if (dirIdx !== -1 && argv[dirIdx + 1]) cliRoot = argv[dirIdx + 1];
if (!cliRoot) cliRoot = argv.find(a => !a.startsWith('-')) || null;
const argoRoot = path.resolve(cliRoot || defaultRoot);
console.log('Ingestion root:', argoRoot);

function getAllNcFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllNcFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.nc')) {
      results.push(full);
    }
  }
  return results;
}

function safeGetVar(reader, varName) {
  try {
    return reader.getDataVariable(varName);
  } catch (e) {
    return null;
  }
}

function getVarAny(reader, names) {
  for (const n of names) {
    const v = safeGetVar(reader, n);
    if (v != null) return v;
  }
  return null;
}

function isScalar(v) {
  return v != null && typeof v !== 'object';
}

function valueAt(arrOrScalar, idx) {
  if (arrOrScalar == null) return null;
  if (Array.isArray(arrOrScalar) || (arrOrScalar && typeof arrOrScalar.length === 'number')) {
    // TypedArray also has length
    return idx < arrOrScalar.length ? arrOrScalar[idx] : null;
  }
  // scalar
  return arrOrScalar;
}

function juldToDate(daysSince1950) {
  if (daysSince1950 == null || Number.isNaN(daysSince1950)) return null;
  const base = Date.UTC(1950, 0, 1, 0, 0, 0, 0); // 1950-01-01 UTC
  const ms = base + Number(daysSince1950) * 86400000; // days -> ms
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

function epochToDate(value) {
  if (value == null || Number.isNaN(value)) return null;
  // Heuristic: if it's very large, assume milliseconds; else seconds
  const num = Number(value);
  const ms = num > 1e12 ? num : num * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

async function ingestOneFile(ncPath) {
  const buf = fs.readFileSync(ncPath);
  const reader = new netcdfjs.NetCDFReader(buf);

  const temp = getVarAny(reader, ['TEMP', 'TEMP_ADJUSTED', 'Temperature']);
  const lat = getVarAny(reader, ['LATITUDE', 'Lat']);
  const lon = getVarAny(reader, ['LONGITUDE', 'Lon']);
  const pres = getVarAny(reader, ['PRES', 'PRESSURE', 'Pressure']);
  const psal = getVarAny(reader, ['PSAL', 'PSAL_ADJUSTED', 'SALINITY', 'Salinity']);
  const oxy = getVarAny(reader, ['OXYGEN', 'DOXY', 'DOXY_ADJUSTED', 'Oxygen']);
  const nit = getVarAny(reader, ['NITRATE', 'NITRATE_ADJUSTED', 'Nitrate']);
  const depth = getVarAny(reader, ['DEPTH', 'Depth']);
  const juld = getVarAny(reader, ['JULD', 'JULD_ADJUSTED']);
  const timeVar = getVarAny(reader, ['TIME']);

  if (!temp || !lat || !lon || !pres || !psal) {
    console.warn(`Skipping ${ncPath} due to missing variables.`);
    return 0;
  }

  const lengths = [temp, pres, psal, lat, lon, depth, oxy, nit]
    .filter(v => v && typeof v.length === 'number')
    .map(v => v.length);
  const len = lengths.length > 0 ? Math.max(...lengths) : 0;
  if (len === 0) {
    console.warn(`No iterable data length found in ${ncPath}. Skipping.`);
    return 0;
  }

  let inserted = 0;
  await client.query('BEGIN');
  try {
    for (let i = 0; i < len; i++) {
      const tVal = valueAt(temp, i);
      const laVal = valueAt(lat, i);
      const loVal = valueAt(lon, i);
      const pVal = valueAt(pres, i);
      const sVal = valueAt(psal, i);
      const oxyVal = valueAt(oxy, i);
      const nitVal = valueAt(nit, i);
      const dVal = valueAt(depth, i);
      // Time precedence: JULD (days since 1950) > TIME (epoch)
      const juldVal = valueAt(juld, i);
      const timeRaw = valueAt(timeVar, i);
      const timeDate = juldVal != null ? juldToDate(juldVal) : epochToDate(timeRaw);

      if ([tVal, laVal, loVal, pVal, sVal].some(v => v === null || v === undefined || Number.isNaN(v))) {
        continue;
      }
      await client.query(
        `INSERT INTO t1 (temperature, latitude, longitude, pressure, salinity, oxygen, nitrate, depth, time_ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [tVal, laVal, loVal, pVal, sVal, oxyVal, nitVal, dVal, timeDate]
      );
      inserted++;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error inserting from ${ncPath}:`, err.message);
    throw err;
  }
  return inserted;
}

async function main() {
  // Ensure connection
  await client.connect();

  // Optionally ensure table exists (idempotent) and synchronize new columns
  await client.query(`
    CREATE TABLE IF NOT EXISTS t1 (
      id SERIAL PRIMARY KEY,
      temperature DOUBLE PRECISION,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      pressure DOUBLE PRECISION,
      salinity DOUBLE PRECISION,
      oxygen DOUBLE PRECISION,
      nitrate DOUBLE PRECISION,
      depth DOUBLE PRECISION,
      time_ts TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await client.query(`
    ALTER TABLE t1
    ADD COLUMN IF NOT EXISTS oxygen DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS nitrate DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS depth DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS time_ts TIMESTAMPTZ;
  `);

  const files = getAllNcFiles(argoRoot);
  if (files.length === 0) {
    console.log('No .nc files found under', argoRoot);
    await client.end();
    return;
  }

  console.log(`Found ${files.length} .nc files. Starting ingestion...`);
  let total = 0;
  for (const f of files) {
    console.log('Ingesting:', f);
    try {
      const n = await ingestOneFile(f);
      total += n;
      console.log(`Inserted ${n} rows from ${path.basename(f)}`);
    } catch (e) {
      // Already logged
    }
  }

  await client.end();
  console.log(`All done. Total rows inserted: ${total}`);
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  try { await client.end(); } catch {}
  process.exit(1);
});
