// src/config/env.js — environment variable config with validation

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const optional = (key, defaultVal = '') => process.env[key] || defaultVal;

export default {
  NODE_ENV:     optional('NODE_ENV', 'development'),
  PORT:         parseInt(optional('PORT', '3000'), 10),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET:   required('JWT_SECRET'),
  GROQ_API_KEY: required('GROQ_API_KEY'),
  ALLOWED_ORIGINS: optional('ALLOWED_ORIGINS', 'chrome-extension://'),
};
