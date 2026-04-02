const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('Sent', 'Draft') THEN total ELSE 0 END), 0) as outstanding,
        COALESCE(SUM(CASE WHEN status = 'Overdue' THEN total ELSE 0 END), 0) as overdue
      FROM invoices WHERE user_id = $1
    `, [userId]);

    const recentResult = await db.query(`
      SELECT i.*, c.name as client_name, c.company as client_company
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
      LIMIT 5
    `, [userId]);

    const stats = statsResult.rows[0];
    stats.total_invoices = parseInt(stats.total_invoices);

    res.json({ stats, recent: recentResult.rows });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
