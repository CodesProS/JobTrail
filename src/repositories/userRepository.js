// src/repositories/userRepository.js — user DB operations

import { query } from '../config/database.js';

const userRepository = {
  async findByEmail(email) {
    const res = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await query('SELECT id, email, name, created_at FROM users WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  },

  async create({ email, name, passwordHash }) {
    const res = await query(
      `INSERT INTO users (email, name, password_hash, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email, name, created_at`,
      [email, name, passwordHash]
    );
    return res.rows[0];
  },
};

export default userRepository;
