// server.js — JobTrail Express entry point

require('dotenv').config();

const express = require('express');
const { PORT, ALLOWED_ORIGINS } = require('./src/config/env');
const { errorHandler } = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/auth');
const jobRoutes = require('./src/routes/jobs');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  // Allow Chrome extensions and configured origins
  if (
    origin.startsWith('chrome-extension://') ||
    ALLOWED_ORIGINS.split(',').some((o) => origin.includes(o.trim()))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/jobs', jobRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[JobTrail API] Running on port ${PORT}`);
});

module.exports = app;
