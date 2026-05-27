// src/routes/jobs.js — job CRUD + Claude extraction

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const jobRepository = require('../repositories/jobRepository');
const { extractJobData } = require('../services/claudeService');

const router = express.Router();

// All job routes require auth
router.use(requireAuth);

// ── POST /jobs/extract ─────────────────────────────────────────────────────────
// Send page text → Claude → returns structured job fields (does NOT save)

router.post('/extract', async (req, res, next) => {
  try {
    const { text, url, title } = req.body;
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Page text is too short to extract job info' });
    }

    const job = await extractJobData(text, url, title);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

// ── GET /jobs ──────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const jobs = await jobRepository.findAll(req.user.userId);
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

// ── POST /jobs ─────────────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { company, role, location, pay, link, notes, status, applied_date } = req.body;
    if (!company || !role) {
      return res.status(400).json({ error: 'Company and role are required' });
    }

    const VALID_STATUSES = ['applied', 'phone_screen', 'interview', 'offer', 'rejected', 'ghosted'];
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const job = await jobRepository.create({
      userId: req.user.userId,
      company: company.trim(),
      role: role.trim(),
      location,
      pay,
      link,
      notes,
      status: status || 'applied',
      applied_date: applied_date || new Date().toISOString().slice(0, 10),
    });

    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /jobs/:id ────────────────────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await jobRepository.findById(id, req.user.userId);
    if (!existing) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const VALID_STATUSES = ['applied', 'phone_screen', 'interview', 'offer', 'rejected', 'ghosted'];
    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const job = await jobRepository.update(id, req.user.userId, req.body);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /jobs/:id ───────────────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await jobRepository.delete(id, req.user.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
