const fs = require('fs');
const path = require('path');
const netcdfjs = require('netcdfjs');

//  npm run read:variables -- --file "C:\full\path\to\your.nc"
function getAllNcFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
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

function sampleArray(arr, n = 5) {
  const len = arr.length || 0;
  const k = Math.min(n, len);
  const out = [];
  for (let i = 0; i < k; i++) out.push(arr[i]);
  return out;
}

function minMax(arr) {
  if (!arr || !arr.length) return { min: null, max: null };
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v == null || Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) min = null;
  if (max === -Infinity) max = null;
  return { min, max };
}

function summarizeVar(reader, varName) {
  const meta = reader.variables.find(v => v.name === varName);
  if (!meta) return { name: varName, present: false };
  let data = null;
  try {
    data = reader.getDataVariable(varName);
  } catch (e) {}
  const len = data && typeof data.length === 'number' ? data.length : (data != null ? 1 : 0);
  const { min, max } = Array.isArray(data) || (data && typeof data.length === 'number') ? minMax(data) : { min: data, max: data };
  const sample = Array.isArray(data) || (data && typeof data.length === 'number') ? sampleArray(data) : [data];
  return {
    name: varName,
    present: true,
    dimensions: meta.dimensions,
    length: len,
    min,
    max,
    sample
  };
}

function findFirstPresent(reader, names) {
  for (const n of names) {
    const found = reader.variables.find(v => v.name === n);
    if (found) return n;
  }
  return null;
}

function printSummary(filePath) {
  const buf = fs.readFileSync(filePath);
  const reader = new netcdfjs.NetCDFReader(buf);

  console.log('File:', filePath);
  console.log('--- Global Attributes ---');
  for (const attr of reader.attributes || []) {
    console.log(`  ${attr.name}:`, attr.value);
  }

  console.log('\n--- All Variables ---');
  for (const v of reader.variables || []) {
    console.log(`  ${v.name}  dims=${JSON.stringify(v.dimensions)}`);
  }

  const groups = {
    temperature: ['TEMP', 'TEMP_ADJUSTED', 'Temperature'],
    latitude: ['LATITUDE', 'Lat'],
    longitude: ['LONGITUDE', 'Lon'],
    pressure: ['PRES', 'PRESSURE', 'Pressure'],
    salinity: ['PSAL', 'PSAL_ADJUSTED', 'SALINITY', 'Salinity'],
    oxygen: ['OXYGEN', 'DOXY', 'DOXY_ADJUSTED', 'Oxygen'],
    nitrate: ['NITRATE', 'NITRATE_ADJUSTED', 'Nitrate'],
    depth: ['DEPTH', 'Depth'],
    time_juld: ['JULD', 'JULD_ADJUSTED'],
    time_epoch: ['TIME']
  };

  console.log('\n--- Main Variables Summary ---');
  for (const [label, candidates] of Object.entries(groups)) {
    const chosen = findFirstPresent(reader, candidates);
    if (!chosen) {
      console.log(`  ${label}: not found (${candidates.join(', ')})`);
      continue;
    }
    const summary = summarizeVar(reader, chosen);
    console.log(`  ${label} -> ${chosen}`);
    console.log(`    dims: ${JSON.stringify(summary.dimensions)} length: ${summary.length}`);
    console.log(`    min: ${summary.min} max: ${summary.max}`);
    console.log(`    sample: ${JSON.stringify(summary.sample)}`);
  }
}

async function main() {
  // Accept --file <path> or first positional argument
  const args = process.argv.slice(2);
  let p = null;
  const idx = args.indexOf('--file');
  if (idx !== -1 && args[idx + 1]) p = args[idx + 1];
  if (!p) p = args.find(a => !a.startsWith('-')) || null;

  if (!p) {
    const argoRoot = path.join(__dirname, 'Argo data');
    const files = getAllNcFiles(argoRoot);
    if (!files.length) {
      console.error('No .nc file provided and none found under', argoRoot);
      console.error('Usage: node read_variables.js --file path/to/file.nc');
      process.exit(1);
    }
    p = files[0];
  }

  if (!fs.existsSync(p)) {
    console.error('File not found:', p);
    process.exit(1);
  }

  printSummary(p);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
