// src/middleware/auth.js — JWT authentication middleware

const { verify } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verify(token);
    req.user = payload; // { userId, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}

module.exports = { requireAuth };
