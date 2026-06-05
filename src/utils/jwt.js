// src/utils/jwt.js — raw JWT using Node's crypto module (no libraries)

import crypto from 'crypto';
import env from '../config/env.js';

const ALGORITHM = 'HS256';
const EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64urlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

export function sign(payload) {
  const header = base64urlEncode(JSON.stringify({ alg: ALGORITHM, typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64urlEncode(
    JSON.stringify({ ...payload, iat: now, exp: now + EXPIRY_SECONDS })
  );
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${header}.${body}.${signature}`;
}

export function verify(token) {
  if (!token || typeof token !== 'string') throw new Error('No token provided');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const [header, body, signature] = parts;

  const expected = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expected, 'utf8')
    )
  ) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(base64urlDecode(body));
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}
