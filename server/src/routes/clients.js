const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/clients
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clients WHERE user_id = $1 ORDER BY name ASC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/clients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /api/clients
router.post('/', auth, async (req, res) => {
  const { name, email = '', address = '', company = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await db.query(
      'INSERT INTO clients (user_id, name, email, address, company) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, name, email, address, company]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT /api/clients/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await db.query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Client not found' });

    const { name, email = '', address = '', company = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await db.query(
      'UPDATE clients SET name = $1, email = $2, address = $3, company = $4 WHERE id = $5 RETURNING *',
      [name, email, address, company, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await db.query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Client not found' });
    await db.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
