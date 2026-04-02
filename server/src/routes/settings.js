const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, business_name, business_address, business_email, business_phone, default_tax_rate, default_payment_terms FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings
router.put('/', auth, async (req, res) => {
  const {
    business_name = '', business_address = '', business_email = '',
    business_phone = '', default_tax_rate = 0, default_payment_terms = 'Net 30',
  } = req.body;
  try {
    const result = await db.query(`
      UPDATE users SET
        business_name = $1, business_address = $2, business_email = $3,
        business_phone = $4, default_tax_rate = $5, default_payment_terms = $6
      WHERE id = $7
      RETURNING id, email, business_name, business_address, business_email, business_phone, default_tax_rate, default_payment_terms
    `, [business_name, business_address, business_email, business_phone, default_tax_rate, default_payment_terms, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
