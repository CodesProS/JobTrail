// scripts/migrate.js — creates DB tables (run once on first deploy)

import 'dotenv/config';
import { query, pool } from '../src/config/database.js';

const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS applications (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company      TEXT NOT NULL,
  role         TEXT NOT NULL,
  location     TEXT,
  pay          TEXT,
  link         TEXT,
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'applied'
                 CHECK (status IN ('applied','phone_screen','interview','offer','rejected','ghosted')),
  applied_date DATE,
  term         TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add term column if upgrading existing DB
ALTER TABLE applications ADD COLUMN IF NOT EXISTS term TEXT;

CREATE INDEX IF NOT EXISTS applications_user_id_idx ON applications (user_id);
CREATE INDEX IF NOT EXISTS applications_status_idx  ON applications (status);
`;

(async () => {
  try {
    console.log('Running migration…');
    await query(SQL);
    console.log('✓ Migration complete');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
