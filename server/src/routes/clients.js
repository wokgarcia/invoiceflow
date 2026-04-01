const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/clients
router.get('/', auth, (req, res) => {
  const clients = db.prepare(
    'SELECT * FROM clients WHERE user_id = ? ORDER BY name ASC'
  ).all(req.user.id);
  res.json(clients);
});

// GET /api/clients/:id
router.get('/:id', auth, (req, res) => {
  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

// POST /api/clients
router.post('/', auth, (req, res) => {
  const { name, email = '', address = '', company = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(
    'INSERT INTO clients (user_id, name, email, address, company) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, name, email, address, company);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

// PUT /api/clients/:id
router.put('/:id', auth, (req, res) => {
  const existing = db.prepare(
    'SELECT id FROM clients WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const { name, email = '', address = '', company = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.prepare(
    'UPDATE clients SET name = ?, email = ?, address = ?, company = ? WHERE id = ?'
  ).run(name, email, address, company, req.params.id);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(client);
});

// DELETE /api/clients/:id
router.delete('/:id', auth, (req, res) => {
  const existing = db.prepare(
    'SELECT id FROM clients WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
