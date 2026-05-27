// src/config/env.js — environment variable config with validation

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const optional = (key, defaultVal = '') => process.env[key] || defaultVal;

module.exports = {
  NODE_ENV:     optional('NODE_ENV', 'development'),
  PORT:         parseInt(optional('PORT', '3000'), 10),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET:   required('JWT_SECRET'),
  CLAUDE_API_KEY: required('CLAUDE_API_KEY'),
  CLAUDE_MODEL: optional('CLAUDE_MODEL', 'claude-haiku-4-5-20251001'),
  ALLOWED_ORIGINS: optional('ALLOWED_ORIGINS', 'chrome-extension://'),
};
