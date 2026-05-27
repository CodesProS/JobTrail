// src/middleware/errorHandler.js — global error handler

const { NODE_ENV } = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  const body = { error: message };
  if (NODE_ENV !== 'production') body.stack = err.stack;

  res.status(status).json(body);
}

module.exports = { errorHandler };
