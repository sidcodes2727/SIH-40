const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
// Always load .env from the backend root so callers can run from any cwd
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD ?? ''),
  port: Number(process.env.DB_PORT ?? 5432),
});

module.exports = client;
