require('dotenv').config();
const express = require("express");
const client = require("./database/db");
const app = express();
const port = process.env.PORT || 3001;
const cors = require("cors");
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Ensure fetch exists (Node 18+ has global fetch). Try node-fetch fallback for older Node.
(() => {
  if (typeof fetch !== 'function') {
    try {
      const nf = require('node-fetch');
      global.fetch = nf;
      console.log('Using node-fetch fallback');
    } catch (e) {
      console.warn('fetch is not available and node-fetch is not installed. External requests will fail. Install with: npm i node-fetch@2');
    }
  }
})();

client.connect();

app.get("/", (req, res) => {
  res.send("🌊 ARGO Backend API is running!");
});

// Helper: normalize metrics to numbers with nulls -> 0
function normalizeMetrics(row) {
  const out = { ...row };
  const coerce = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    // Guard against sentinel extremes sometimes used in datasets
    if (Math.abs(n) > 1e6) return 0;
    return n;
  };
  if ('temperature' in out) out.temperature = coerce(out.temperature);
  if ('salinity' in out) out.salinity = coerce(out.salinity);
  if ('oxygen' in out) out.oxygen = coerce(out.oxygen);
  if ('pressure' in out) out.pressure = coerce(out.pressure);
  if ('depth' in out) out.depth = coerce(out.depth);
  return out;
}

// Chat with contextual data from Postgres near given lat/lon ± rangeDeg (degrees)
app.post('/ai/chat_context', async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GOOGLE_API_KEY not set on server' });
    }
    const { messages = [], lat, lon, rangeDeg, limit = 100 } = req.body || {};
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const rangeNum = parseFloat(rangeDeg);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || !Number.isFinite(rangeNum)) {
      return res.status(400).json({ error: 'lat, lon, rangeDeg must be numbers' });
    }

    const latMin = latNum - rangeNum;
    const latMax = latNum + rangeNum;
    const lonMin = lonNum - rangeNum;
    const lonMax = lonNum + rangeNum;

    // Pull a bounded set of rows for context
    const q = `SELECT latitude, longitude, depth, temperature, salinity, oxygen, time_ts
               FROM t1
               WHERE latitude BETWEEN $1 AND $2
                 AND longitude BETWEEN $3 AND $4
                 AND (temperature IS NOT NULL OR salinity IS NOT NULL OR oxygen IS NOT NULL)
               ORDER BY time_ts DESC, depth ASC
               LIMIT $5`;
    const db = await client.query(q, [latMin, latMax, lonMin, lonMax, Math.max(1, Math.min(1000, Number(limit) || 100))]);
    const rows = (db.rows || []).map(normalizeMetrics);

    // Summarize basic stats to keep prompt small
    const nums = (arr) => arr.map(Number).filter(n => Number.isFinite(n));
    function stat(values) {
      const v = nums(values);
      if (!v.length) return null;
      const min = Math.min(...v), max = Math.max(...v);
      const mean = v.reduce((s, x) => s + x, 0) / v.length;
      return { count: v.length, min, max, mean };
    }
    const summary = {
      region: { center: { lat: latNum, lon: lonNum }, rangeDeg: rangeNum },
      totals: rows.length,
      depth: stat(rows.map(r => r.depth)),
      temperature: stat(rows.map(r => r.temperature)),
      salinity: stat(rows.map(r => r.salinity)),
      oxygen: stat(rows.map(r => r.oxygen)),
      sample: rows.slice(0, 10)
    };

    // Build Gemini contents with context preamble
    const userMessages = (messages || []).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }));
    const contextPreamble = {
      role: 'user',
      parts: [{ text: `You are provided ARGO float data context near lat=${latNum}, lon=${lonNum}, rangeDeg=${rangeNum}. Use it to answer concisely. Context JSON:\n${JSON.stringify(summary)}` }]
    };
    const contents = [contextPreamble, ...userMessages];

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(500).json({ error: 'Gemini API error', details: errText });
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text, usedRows: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Chat with context failed' });
  }
});

// DB-only advisory: basic suitability for fishing and cargo based on ARGO stats
// Note: This is a heuristic and does not include sea state (waves), winds, or currents.
// For cargo, external marine conditions are recommended for accuracy.
app.post('/advisory', async (req, res) => {
  try {
    const { lat, lon, rangeDeg, limit = 500 } = req.body || {};
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const rangeNum = parseFloat(rangeDeg);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || !Number.isFinite(rangeNum)) {
      return res.status(400).json({ error: 'lat, lon, rangeDeg must be numbers' });
    }

    const latMin = latNum - rangeNum;
    const latMax = latNum + rangeNum;
    const lonMin = lonNum - rangeNum;
    const lonMax = lonNum + rangeNum;

    const q = `SELECT latitude, longitude, depth, temperature, salinity, oxygen, nitrate, time_ts
               FROM t1
               WHERE latitude BETWEEN $1 AND $2
                 AND longitude BETWEEN $3 AND $4
                 AND (temperature IS NOT NULL OR salinity IS NOT NULL OR oxygen IS NOT NULL OR nitrate IS NOT NULL)
               ORDER BY time_ts DESC, depth ASC
               LIMIT $5`;
    const db = await client.query(q, [latMin, latMax, lonMin, lonMax, Math.max(1, Math.min(5000, Number(limit) || 500))]);
    const rows = (db.rows || []).map(normalizeMetrics);

    const nums = (arr) => arr.map(Number).filter(n => Number.isFinite(n));
    function stat(values) {
      const v = nums(values);
      if (!v.length) return null;
      const min = Math.min(...v), max = Math.max(...v);
      const mean = v.reduce((s, x) => s + x, 0) / v.length;
      return { count: v.length, min, max, mean };
    }

    const depthS = stat(rows.map(r => r.depth));
    const tempS = stat(rows.map(r => r.temperature));
    const oxyS = stat(rows.map(r => r.oxygen));
    const salS = stat(rows.map(r => r.salinity));
    const nitS = stat(rows.map(r => r.nitrate));

    // Simple heuristics (generic, non-species-specific)
    function fishingRating() {
      // Oxygen thresholds (mg/L): <2 poor, 2-4 moderate, >4 better
      let score = 0;
      const reasons = [];
      if (oxyS && oxyS.mean >= 4) { score += 2; reasons.push('oxygen adequate (>=4 mg/L)'); }
      else if (oxyS && oxyS.mean >= 2) { score += 1; reasons.push('oxygen moderate (2–4 mg/L)'); }
      else { reasons.push('oxygen low (<2 mg/L)'); }

      // Temperature comfort band (°C) generic 10–25°C for many pelagic species
      if (tempS && tempS.mean >= 10 && tempS.mean <= 25) { score += 2; reasons.push('temperature in a common favorable range (10–25°C)'); }
      else { reasons.push('temperature outside generic 10–25°C band'); }

      // Nitrate as productivity proxy (µmol/L): >2 suggests productivity
      if (nitS && nitS.mean >= 2) { score += 1; reasons.push('nitrate suggests potential productivity'); }

      // Depth: present but not rated directly; included for context

      let rating = 'poor';
      if (score >= 4) rating = 'good';
      else if (score >= 2) rating = 'moderate';

      return { rating, score, reasons };
    }

    function cargoRating() {
      // Without waves, winds, and currents, cargo suitability cannot be reliably assessed
      // Provide conservative status and suggest adding marine API
      const reasons = ['No wave/wind/current data available; cargo suitability requires sea state'];
      return { rating: 'insufficient_data', score: 0, reasons };
    }

    const out = {
      region: { center: { lat: latNum, lon: lonNum }, rangeDeg: rangeNum },
      usedRows: rows.length,
      stats: {
        depth: depthS,
        temperature: tempS,
        oxygen: oxyS,
        salinity: salS,
        nitrate: nitS,
      },
      advisory: {
        fishing: fishingRating(),
        cargo: cargoRating(),
        limitations: [
          'Heuristic based on ARGO physical/chemical data only',
          'For cargo, add sea state (significant wave height) and wind for reliable assessment',
        ]
      }
    };

    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Advisory computation failed' });
  }
});

// Simple aquatic life endpoint using OBIS within bbox
app.get('/aquatic_life', async (req, res) => {
  try {
    const { lat, lon, rangeDeg } = req.query;
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const rangeNum = parseFloat(rangeDeg);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || !Number.isFinite(rangeNum)) {
      return res.status(400).json({ error: 'lat, lon, rangeDeg must be numbers' });
    }
    const obisHost = 'https://api.obis.org';
    if (!isAllowedUrl(obisHost + '/')) {
      return res.status(400).json({ error: 'api.obis.org must be added to ALLOWLIST_HOSTS' });
    }
    const latMin = latNum - rangeNum;
    const latMax = latNum + rangeNum;
    const lonMin = lonNum - rangeNum;
    const lonMax = lonNum + rangeNum;
    const bbox = `${lonMin},${latMin},${lonMax},${latMax}`;

    const urlTotal = `${obisHost}/v3/occurrence?bbox=${encodeURIComponent(bbox)}&size=0`;
    const ctl1 = new AbortController();
    const t1 = setTimeout(() => ctl1.abort(), 10000);
    const totalResp = await fetch(urlTotal, { signal: ctl1.signal });
    clearTimeout(t1);
    if (!totalResp.ok) {
      return res.status(502).json({ error: `OBIS total fetch failed`, status: totalResp.status });
    }
    const totalJson = await totalResp.json();

    const urlNames = `${obisHost}/v3/occurrence?bbox=${encodeURIComponent(bbox)}&size=50&fields=scientificName`;
    const ctl2 = new AbortController();
    const t2 = setTimeout(() => ctl2.abort(), 10000);
    const namesResp = await fetch(urlNames, { signal: ctl2.signal });
    clearTimeout(t2);
    if (!namesResp.ok) {
      return res.status(502).json({ error: `OBIS names fetch failed`, status: namesResp.status });
    }
    const namesJson = await namesResp.json();
    const sampleNames = Array.isArray(namesJson?.results)
      ? namesJson.results.map(r => r.scientificName).filter(Boolean)
      : [];

    res.json({
      bbox: { latMin, latMax, lonMin, lonMax },
      totalOccurrences: totalJson?.total ?? null,
      sampleScientificNames: sampleNames
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'aquatic life fetch failed' });
  }
});

// Allowlisted external fetch helper
function getAllowlist() {
  const raw = process.env.ALLOWLIST_HOSTS || '';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
function isAllowedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.host.toLowerCase();
    const allow = getAllowlist();
    return allow.some(a => host === a || host.endsWith('.' + a));
  } catch {
    return false;
  }
}

// GET-only, allowlisted external fetch proxy
app.post('/ai/fetch_external', async (req, res) => {
  try {
    const { url, query = {}, headers = {} } = req.body || {};
    if (!url || !isAllowedUrl(url)) {
      return res.status(400).json({ error: 'URL missing or not allowlisted' });
    }
    const u = new URL(url);
    Object.entries(query || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    });

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(u.toString(), {
      method: 'GET',
      headers: headers && typeof headers === 'object' ? headers : {},
      signal: controller.signal
    });
    clearTimeout(to);
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await resp.json();
      return res.json({ status: resp.status, data });
    } else {
      const text = await resp.text();
      return res.json({ status: resp.status, text });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'External fetch failed' });
  }
});

// Hybrid chat: combine DB context and external sources, answered by Gemini
app.post('/ai/chat_hybrid', async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GOOGLE_API_KEY not set on server' });
    }
    const { messages = [], lat, lon, rangeDeg, limit = 100, externals = [] } = req.body || {};

    // 1) Build DB context if coordinates are provided
    let dbSummary = null;
    if ([lat, lon, rangeDeg].every(v => v !== undefined)) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      const rangeNum = parseFloat(rangeDeg);
      if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || !Number.isFinite(rangeNum)) {
        return res.status(400).json({ error: 'lat, lon, rangeDeg must be numbers' });
      }
      const latMin = latNum - rangeNum;
      const latMax = latNum + rangeNum;
      const lonMin = lonNum - rangeNum;
      const lonMax = lonNum + rangeNum;
      const q = `SELECT latitude, longitude, depth, temperature, salinity, oxygen, nitrate, time_ts
                 FROM t1
                 WHERE latitude BETWEEN $1 AND $2
                   AND longitude BETWEEN $3 AND $4
                   AND (temperature IS NOT NULL OR salinity IS NOT NULL OR oxygen IS NOT NULL OR nitrate IS NOT NULL)
                 ORDER BY time_ts DESC, depth ASC
                 LIMIT $5`;
      const db = await client.query(q, [latMin, latMax, lonMin, lonMax, Math.max(1, Math.min(1000, Number(limit) || 100))]);
      const rows = (db.rows || []).map(normalizeMetrics);
      const nums = (arr) => arr.map(Number).filter(n => Number.isFinite(n));
      function stat(values) {
        const v = nums(values);
        if (!v.length) return null;
        const min = Math.min(...v), max = Math.max(...v);
        const mean = v.reduce((s, x) => s + x, 0) / v.length;
        return { count: v.length, min, max, mean };
      }
      dbSummary = {
        region: { center: { lat: latNum, lon: lonNum }, rangeDeg: rangeNum },
        totals: rows.length,
        depth: stat(rows.map(r => r.depth)),
        temperature: stat(rows.map(r => r.temperature)),
        salinity: stat(rows.map(r => r.salinity)),
        oxygen: stat(rows.map(r => r.oxygen)),
        nitrate: stat(rows.map(r => r.nitrate)),
        sample: rows.slice(0, 10)
      };
    }

    // 2) Fetch external sources (GET-only, allowlisted)
    const externalSummaries = [];
    for (const reqExt of Array.isArray(externals) ? externals : []) {
      const { url, query = {}, headers = {} } = reqExt || {};
      if (!url || !isAllowedUrl(url)) continue;
      try {
        const u = new URL(url);
        Object.entries(query || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
        });
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(u.toString(), { method: 'GET', headers, signal: controller.signal });
        clearTimeout(to);
        let payload;
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) payload = await resp.json();
        else payload = await resp.text();
        externalSummaries.push({ url, status: resp.status, payload });
      } catch (e) {
        externalSummaries.push({ url, error: e.message || 'fetch failed' });
      }
    }

    // 2b) Auto-fetch aquatic life (OBIS) if bbox provided and allowlisted
    if (dbSummary) {
      try {
        const obisHost = 'https://api.obis.org';
        if (isAllowedUrl(obisHost + '/')) {
          const { center, rangeDeg } = dbSummary.region;
          const latMin = center.lat - rangeDeg;
          const latMax = center.lat + rangeDeg;
          const lonMin = center.lon - rangeDeg;
          const lonMax = center.lon + rangeDeg;
          const bbox = `${lonMin},${latMin},${lonMax},${latMax}`; // OBIS expects lon,lat,lon,lat

          // Total occurrences (size=0)
          const urlTotal = `${obisHost}/v3/occurrence?bbox=${encodeURIComponent(bbox)}&size=0`;
          const ctl1 = new AbortController();
          const t1 = setTimeout(() => ctl1.abort(), 10000);
          const totalResp = await fetch(urlTotal, { signal: ctl1.signal });
          clearTimeout(t1);
          const totalJson = totalResp.ok ? await totalResp.json() : { error: `status ${totalResp.status}` };

          // Sample species names (size=50)
          const urlNames = `${obisHost}/v3/occurrence?bbox=${encodeURIComponent(bbox)}&size=50&fields=scientificName`;
          const ctl2 = new AbortController();
          const t2 = setTimeout(() => ctl2.abort(), 10000);
          const namesResp = await fetch(urlNames, { signal: ctl2.signal });
          clearTimeout(t2);
          const namesJson = namesResp.ok ? await namesResp.json() : { results: [], error: `status ${namesResp.status}` };
          const sampleNames = Array.isArray(namesJson?.results)
            ? namesJson.results.map(r => r.scientificName).filter(Boolean)
            : [];

          externalSummaries.push({
            url: urlTotal,
            obis: true,
            type: 'aquatic_life_total',
            payload: { total: totalJson?.total ?? null }
          });
          externalSummaries.push({
            url: urlNames,
            obis: true,
            type: 'aquatic_life_sample',
            payload: { sampleScientificNames: sampleNames }
          });
        }
      } catch (e) {
        externalSummaries.push({ provider: 'obis', error: e.message || 'obis fetch failed' });
      }
    }

    // 3) Compose prompt for Gemini
    const parts = [];
    if (dbSummary) {
      parts.push(`DB context JSON:\n${JSON.stringify(dbSummary)}`);
    }
    if (externalSummaries.length) {
      parts.push(`External sources JSON:\n${JSON.stringify(externalSummaries)}`);
    }
    const instruction = `Instructions:\n- Use the DB context and external sources provided to answer.\n- Always include depth and temperature statistics (min/mean/max and sample count) when available from DB.\n- If OBIS aquatic life data is present (type=aquatic_life_*), summarize total occurrences and list several representative scientific names.\n- If some source is missing or empty, say that clearly rather than guessing.\n- Keep the answer concise and include a short 'Sources: DB, OBIS' footer when applicable.`;
    const contextText = [instruction, ...parts].join('\n\n');
    const contextPreamble = parts.length ? { role: 'user', parts: [{ text: contextText }] } : null;
    const userMessages = (messages || []).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }));
    const contents = contextPreamble ? [contextPreamble, ...userMessages] : userMessages;

    const urlGem = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
    const respGem = await fetch(urlGem, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    if (!respGem.ok) {
      const errText = await respGem.text();
      return res.status(500).json({ error: 'Gemini API error', details: errText });
    }
    const dataGem = await respGem.json();
    const text = dataGem?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text, sources: { db: !!dbSummary, externalCount: externalSummaries.length } });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Hybrid chat failed' });
  }
});

// Local, DB-only chat-style summary (no external LLM/API)
app.post('/ai/chat_db', async (req, res) => {
  try {
    const { lat, lon, rangeDeg, limit = 100 } = req.body || {};
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const rangeNum = parseFloat(rangeDeg);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || !Number.isFinite(rangeNum)) {
      return res.status(400).json({ error: 'lat, lon, rangeDeg must be numbers' });
    }

    const latMin = latNum - rangeNum;
    const latMax = latNum + rangeNum;
    const lonMin = lonNum - rangeNum;
    const lonMax = lonNum + rangeNum;

    const q = `SELECT latitude, longitude, depth, temperature, salinity, oxygen, nitrate, time_ts
               FROM t1
               WHERE latitude BETWEEN $1 AND $2
                 AND longitude BETWEEN $3 AND $4
                 AND (temperature IS NOT NULL OR salinity IS NOT NULL OR oxygen IS NOT NULL OR nitrate IS NOT NULL)
               ORDER BY time_ts DESC, depth ASC
               LIMIT $5`;
    const dbResp = await client.query(q, [latMin, latMax, lonMin, lonMax, Math.max(1, Math.min(1000, Number(limit) || 100))]);
    const rows = (dbResp.rows || []).map(normalizeMetrics);

    const nums = (arr) => arr.map(Number).filter(n => Number.isFinite(n));
    function stat(values) {
      const v = nums(values);
      if (!v.length) return null;
      const min = Math.min(...v), max = Math.max(...v);
      const mean = v.reduce((s, x) => s + x, 0) / v.length;
      return { count: v.length, min, max, mean };
    }
    const depthS = stat(rows.map(r => r.depth));
    const tempS = stat(rows.map(r => r.temperature));
    const salS = stat(rows.map(r => r.salinity));
    const oxyS = stat(rows.map(r => r.oxygen));
    const nitS = stat(rows.map(r => r.nitrate));

    function fmtStat(label, s, unit) {
      if (!s) return `${label}: no data`;
      return `${label}: n=${s.count}, min=${s.min.toFixed(3)}${unit}, mean=${s.mean.toFixed(3)}${unit}, max=${s.max.toFixed(3)}${unit}`;
    }

    const text = [
      `Region summary near lat=${latNum.toFixed(4)}, lon=${lonNum.toFixed(4)} (±${rangeNum}°)`,
      `Total rows used: ${rows.length}`,
      fmtStat('Depth', depthS, ' m'),
      fmtStat('Temperature', tempS, ' °C'),
      fmtStat('Salinity', salS, ' PSU'),
      fmtStat('Oxygen', oxyS, ' mg/L'),
      fmtStat('Nitrate', nitS, ' µmol/L')
    ].join('\n');

    res.json({ text, usedRows: rows.length, center: { lat: latNum, lon: lonNum }, rangeDeg: rangeNum });
  } catch (err) {
    res.status(500).json({ error: err.message || 'DB-only chat failed' });
  }
});

app.get("/everything", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM t1 ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 100"
    );
    const rows = (result.rows || []).map(normalizeMetrics);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/latlong", async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const result = await client.query(
      "SELECT * FROM t1 WHERE latitude=$1 AND longitude=$2 ORDER BY time_ts ASC, depth ASC LIMIT 50",
      [lat, lon]
    );
    const rows = (result.rows || []).map(normalizeMetrics);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New GET route for latitude, longitude, and temperature
app.get("/temperature", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, temperature FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    const rows = (result.rows || []).map(normalizeMetrics);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/pressure", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, pressure FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND pressure IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    const rows = (result.rows || []).map(normalizeMetrics);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/salinity", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, salinity FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    const rows = (result.rows || []).map(normalizeMetrics);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/oxygen", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, oxygen FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    const rows = (result.rows || []).map(normalizeMetrics);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/nitrate", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, nitrate FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND nitrate IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    // Nitrate is left as-is; no normalization to 0 requested
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/depth", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, depth FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND depth IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    const rows = (result.rows || []).map(normalizeMetrics);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Query profiles within latitude/longitude ± rangeDeg (degrees)
app.get("/profiles", async (req, res) => {
  try {
    const { lat, lon, rangeDeg } = req.query;
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const rangeNum = parseFloat(rangeDeg);

    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || !Number.isFinite(rangeNum)) {
      return res.status(400).json({ error: "lat, lon, rangeDeg (numbers) are required" });
    }

    const latMin = latNum - rangeNum;
    const latMax = latNum + rangeNum;
    const lonMin = lonNum - rangeNum;
    const lonMax = lonNum + rangeNum;

    const result = await client.query(
      `SELECT latitude, longitude, depth, temperature, salinity, oxygen, time_ts
       FROM t1
       WHERE latitude BETWEEN $1 AND $2
         AND longitude BETWEEN $3 AND $4
         AND depth IS NOT NULL
       ORDER BY time_ts ASC, depth ASC
       LIMIT 5000`,
      [latMin, latMax, lonMin, lonMax]
    );
    const rows = (result.rows || []).map(normalizeMetrics);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/time", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, time_ts FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND time_ts IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple proxy to Google Gemini for chat
app.post('/ai/chat', async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GOOGLE_API_KEY not set on server' });
    }
    const { messages = [] } = req.body || {};
    // Convert simple role/content list to Gemini generateContent format
    const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }));

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(500).json({ error: 'Gemini API error', details: errText });
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
