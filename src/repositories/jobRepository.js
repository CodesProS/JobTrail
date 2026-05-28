// src/repositories/jobRepository.js — job applications DB operations

const { query } = require('../config/database');

const jobRepository = {
  async findAll(userId) {
    const res = await query(
      `SELECT * FROM applications
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    return res.rows;
  },

  async findById(id, userId) {
    const res = await query(
      'SELECT * FROM applications WHERE id = $1 AND user_id = $2 LIMIT 1',
      [id, userId]
    );
    return res.rows[0] || null;
  },

  async create({ userId, company, role, location, pay, link, notes, status, applied_date, term }) {
    const res = await query(
      `INSERT INTO applications
         (user_id, company, role, location, pay, link, notes, status, applied_date, term, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [userId, company, role, location || null, pay || null, link || null, notes || null, status || 'applied', applied_date || null, term || null]
    );
    return res.rows[0];
  },

  async update(id, userId, fields) {
    // Build dynamic SET clause from provided fields
    const allowed = ['company', 'role', 'location', 'pay', 'link', 'notes', 'status', 'applied_date', 'term'];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${idx}`);
        values.push(fields[key] || null);
        idx++;
      }
    }

    if (setClauses.length === 0) return null;

    setClauses.push(`updated_at = NOW()`);
    values.push(id, userId);

    const res = await query(
      `UPDATE applications
       SET ${setClauses.join(', ')}
       WHERE id = $${idx} AND user_id = $${idx + 1}
       RETURNING *`,
      values
    );
    return res.rows[0] || null;
  },

  async delete(id, userId) {
    const res = await query(
      'DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return res.rowCount > 0;
  },
};

module.exports = jobRepository;
