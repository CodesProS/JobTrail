// src/routes/auth.js — register + login

const express = require('express');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const { sign } = require('../utils/jwt');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ── POST /auth/register ───────────────────────────────────────────────────────

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await userRepository.findByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await userRepository.create({
      email: email.toLowerCase().trim(),
      name: name?.trim() || '',
      passwordHash: hashPassword(password),
    });

    const token = sign({ userId: user.id, email: user.email });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const hash = hashPassword(password);
    if (
      !crypto.timingSafeEqual(
        Buffer.from(user.password_hash, 'utf8'),
        Buffer.from(hash, 'utf8')
      )
    ) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = sign({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
