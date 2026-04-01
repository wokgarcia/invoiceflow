const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

function getNextInvoiceNumber(userId) {
  const last = db.prepare(
    "SELECT invoice_number FROM invoices WHERE user_id = ? ORDER BY id DESC LIMIT 1"
  ).get(userId);
  if (!last) return 'INV-0001';
  const match = last.invoice_number.match(/(\d+)$/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;
  return `INV-${String(num).padStart(4, '0')}`;
}

// GET /api/invoices/next-number
router.get('/next-number', auth, (req, res) => {
  res.json({ invoiceNumber: getNextInvoiceNumber(req.user.id) });
});

// GET /api/invoices
router.get('/', auth, (req, res) => {
  const invoices = db.prepare(`
    SELECT i.*, c.name as client_name, c.company as client_company
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC
  `).all(req.user.id);
  res.json(invoices);
});

// GET /api/invoices/:id
router.get('/:id', auth, (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, c.name as client_name, c.company as client_company,
           c.email as client_email, c.address as client_address
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const items = db.prepare(
    'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC'
  ).all(invoice.id);

  res.json({ ...invoice, items });
});

// POST /api/invoices
router.post('/', auth, (req, res) => {
  const {
    client_id,
    invoice_number,
    status = 'Draft',
    currency = 'USD',
    tax_rate = 0,
    payment_terms = 'Net 30',
    issue_date = '',
    due_date = '',
    notes = '',
    items = [],
  } = req.body;

  if (!client_id) return res.status(400).json({ error: 'Client is required' });

  // Verify client belongs to user
  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(client_id, req.user.id);
  if (!client) return res.status(400).json({ error: 'Invalid client' });

  const invNumber = invoice_number || getNextInvoiceNumber(req.user.id);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const tax_amount = subtotal * (parseFloat(tax_rate) / 100);
  const total = subtotal + tax_amount;

  const result = db.prepare(`
    INSERT INTO invoices (user_id, client_id, invoice_number, status, currency, tax_rate, payment_terms, issue_date, due_date, notes, subtotal, tax_amount, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, client_id, invNumber, status, currency, tax_rate, payment_terms, issue_date, due_date, notes, subtotal, tax_amount, total);

  const invoiceId = result.lastInsertRowid;

  const insertItem = db.prepare(
    'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)'
  );
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    insertItem.run(invoiceId, item.description || '', qty, price, qty * price);
  }

  const invoice = db.prepare(`
    SELECT i.*, c.name as client_name, c.company as client_company,
           c.email as client_email, c.address as client_address
    FROM invoices i JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `).get(invoiceId);
  const savedItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);

  res.status(201).json({ ...invoice, items: savedItems });
});

// PUT /api/invoices/:id
router.put('/:id', auth, (req, res) => {
  const existing = db.prepare(
    'SELECT id FROM invoices WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  const {
    client_id,
    invoice_number,
    status = 'Draft',
    currency = 'USD',
    tax_rate = 0,
    payment_terms = 'Net 30',
    issue_date = '',
    due_date = '',
    notes = '',
    items = [],
  } = req.body;

  if (!client_id) return res.status(400).json({ error: 'Client is required' });

  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(client_id, req.user.id);
  if (!client) return res.status(400).json({ error: 'Invalid client' });

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const tax_amount = subtotal * (parseFloat(tax_rate) / 100);
  const total = subtotal + tax_amount;

  db.prepare(`
    UPDATE invoices SET client_id=?, invoice_number=?, status=?, currency=?, tax_rate=?,
    payment_terms=?, issue_date=?, due_date=?, notes=?, subtotal=?, tax_amount=?, total=?
    WHERE id=?
  `).run(client_id, invoice_number, status, currency, tax_rate, payment_terms, issue_date, due_date, notes, subtotal, tax_amount, total, req.params.id);

  // Replace items
  db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);
  const insertItem = db.prepare(
    'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)'
  );
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    insertItem.run(req.params.id, item.description || '', qty, price, qty * price);
  }

  const invoice = db.prepare(`
    SELECT i.*, c.name as client_name, c.company as client_company,
           c.email as client_email, c.address as client_address
    FROM invoices i JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);
  const savedItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);

  res.json({ ...invoice, items: savedItems });
});

// PATCH /api/invoices/:id/status
router.patch('/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const existing = db.prepare(
    'SELECT id FROM invoices WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true, status });
});

// DELETE /api/invoices/:id
router.delete('/:id', auth, (req, res) => {
  const existing = db.prepare(
    'SELECT id FROM invoices WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
