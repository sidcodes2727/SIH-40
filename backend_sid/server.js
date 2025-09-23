const express = require("express");
const client = require("./database/db");
const app = express();
const port = 3000;
const cors = require("cors");
app.use(cors());
app.use(express.json({ limit: '1mb' }));

client.connect();

app.get("/", (req, res) => {
  res.send("🌊 ARGO Backend API is running!");
});

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
    const rows = db.rows || [];

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

app.get("/everything", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM t1 ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 100"
    );
    res.json(result.rows);
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
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New GET route for latitude, longitude, and temperature
app.get("/temperature", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, temperature FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND temperature IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/pressure", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, pressure FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND pressure IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/salinity", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, salinity FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND salinity IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/oxygen", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, oxygen FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND oxygen IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/nitrate", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT latitude, longitude, nitrate FROM t1 WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND nitrate IS NOT NULL ORDER BY time_ts ASC, latitude ASC, longitude ASC LIMIT 5000"
    );
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
    res.json(result.rows);
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
    res.json(result.rows);
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
