const client = require('./database/db');

async function createTable() {
  const createSql = `
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
  `;
  const alterSql = `
    ALTER TABLE t1
    ADD COLUMN IF NOT EXISTS oxygen DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS nitrate DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS depth DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS time_ts TIMESTAMPTZ;
  `;

  try {
    await client.connect();
    await client.query(createSql);
    await client.query(alterSql);
    console.log('Table t1 ensured and columns synchronized (oxygen, nitrate, depth, time_ts).');
  } catch (err) {
    console.error('Error creating table t1:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

createTable();
