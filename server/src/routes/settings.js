const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', auth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, business_name, business_address, business_email, business_phone, default_tax_rate, default_payment_terms FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PUT /api/settings
router.put('/', auth, (req, res) => {
  const {
    business_name = '',
    business_address = '',
    business_email = '',
    business_phone = '',
    default_tax_rate = 0,
    default_payment_terms = 'Net 30',
  } = req.body;

  db.prepare(`
    UPDATE users SET
      business_name = ?,
      business_address = ?,
      business_email = ?,
      business_phone = ?,
      default_tax_rate = ?,
      default_payment_terms = ?
    WHERE id = ?
  `).run(business_name, business_address, business_email, business_phone, default_tax_rate, default_payment_terms, req.user.id);

  const user = db.prepare(
    'SELECT id, email, business_name, business_address, business_email, business_phone, default_tax_rate, default_payment_terms FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json(user);
});

module.exports = router;
