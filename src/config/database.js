// src/config/database.js — PostgreSQL pool (pg)

const { Pool } = require('pg');
const { DATABASE_URL, NODE_ENV } = require('./env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterized query.
 * @param {string} text  SQL string with $1, $2 placeholders
 * @param {Array}  params Values
 * @returns {Promise<pg.QueryResult>}
 */
async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DB] ${text.slice(0, 60)}… (${Date.now() - start}ms)`);
  }
  return res;
}

module.exports = { query, pool };
