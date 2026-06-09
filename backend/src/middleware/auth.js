// src/middleware/auth.js — JWT authentication middleware

import { verify } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verify(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}
