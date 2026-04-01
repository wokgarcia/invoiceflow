const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', auth, (req, res) => {
  const userId = req.user.id;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_invoices,
      COALESCE(SUM(CASE WHEN status = 'Paid' THEN total ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status IN ('Sent', 'Draft') THEN total ELSE 0 END), 0) as outstanding,
      COALESCE(SUM(CASE WHEN status = 'Overdue' THEN total ELSE 0 END), 0) as overdue
    FROM invoices
    WHERE user_id = ?
  `).get(userId);

  const recent = db.prepare(`
    SELECT i.*, c.name as client_name, c.company as client_company
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC
    LIMIT 5
  `).all(userId);

  res.json({ stats, recent });
});

module.exports = router;
