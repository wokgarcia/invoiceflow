const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

async function getNextInvoiceNumber(userId) {
  const result = await db.query(
    'SELECT invoice_number FROM invoices WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
    [userId]
  );
  if (!result.rows[0]) return 'INV-0001';
  const match = result.rows[0].invoice_number.match(/(\d+)$/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;
  return `INV-${String(num).padStart(4, '0')}`;
}

// GET /api/invoices/next-number
router.get('/next-number', auth, async (req, res) => {
  try {
    res.json({ invoiceNumber: await getNextInvoiceNumber(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get invoice number' });
  }
});

// GET /api/invoices
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, c.name as client_name, c.company as client_company
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, c.name as client_name, c.company as client_company,
             c.email as client_email, c.address as client_address
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.id = $1 AND i.user_id = $2
    `, [req.params.id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Invoice not found' });

    const items = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC', [result.rows[0].id]);
    res.json({ ...result.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// POST /api/invoices
router.post('/', auth, async (req, res) => {
  try {
    const userResult = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (user.plan !== 'pro') {
      const countResult = await db.query('SELECT COUNT(*) as c FROM invoices WHERE user_id = $1', [req.user.id]);
      if (parseInt(countResult.rows[0].c) >= 3) {
        return res.status(403).json({ error: 'Free plan limit reached. Upgrade to Pro for unlimited invoices.', upgrade: true });
      }
    }

    const {
      client_id, invoice_number, status = 'Draft', currency = 'USD',
      tax_rate = 0, payment_terms = 'Net 30', issue_date = '',
      due_date = '', notes = '', items = [],
    } = req.body;

    if (!client_id) return res.status(400).json({ error: 'Client is required' });

    const clientResult = await db.query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [client_id, req.user.id]);
    if (!clientResult.rows[0]) return res.status(400).json({ error: 'Invalid client' });

    const invNumber = invoice_number || await getNextInvoiceNumber(req.user.id);
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
    const tax_amount = subtotal * (parseFloat(tax_rate) / 100);
    const total = subtotal + tax_amount;

    const invResult = await db.query(`
      INSERT INTO invoices (user_id, client_id, invoice_number, status, currency, tax_rate, payment_terms, issue_date, due_date, notes, subtotal, tax_amount, total)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id
    `, [req.user.id, client_id, invNumber, status, currency, tax_rate, payment_terms, issue_date, due_date, notes, subtotal, tax_amount, total]);

    const invoiceId = invResult.rows[0].id;

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      await db.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES ($1, $2, $3, $4, $5)',
        [invoiceId, item.description || '', qty, price, qty * price]
      );
    }

    const invoice = await db.query(`
      SELECT i.*, c.name as client_name, c.company as client_company,
             c.email as client_email, c.address as client_address
      FROM invoices i JOIN clients c ON i.client_id = c.id WHERE i.id = $1
    `, [invoiceId]);
    const savedItems = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

    res.status(201).json({ ...invoice.rows[0], items: savedItems.rows });
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// PUT /api/invoices/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await db.query('SELECT id FROM invoices WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Invoice not found' });

    const {
      client_id, invoice_number, status = 'Draft', currency = 'USD',
      tax_rate = 0, payment_terms = 'Net 30', issue_date = '',
      due_date = '', notes = '', items = [],
    } = req.body;

    if (!client_id) return res.status(400).json({ error: 'Client is required' });

    const clientResult = await db.query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [client_id, req.user.id]);
    if (!clientResult.rows[0]) return res.status(400).json({ error: 'Invalid client' });

    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
    const tax_amount = subtotal * (parseFloat(tax_rate) / 100);
    const total = subtotal + tax_amount;

    await db.query(`
      UPDATE invoices SET client_id=$1, invoice_number=$2, status=$3, currency=$4, tax_rate=$5,
      payment_terms=$6, issue_date=$7, due_date=$8, notes=$9, subtotal=$10, tax_amount=$11, total=$12
      WHERE id=$13
    `, [client_id, invoice_number, status, currency, tax_rate, payment_terms, issue_date, due_date, notes, subtotal, tax_amount, total, req.params.id]);

    await db.query('DELETE FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      await db.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES ($1, $2, $3, $4, $5)',
        [req.params.id, item.description || '', qty, price, qty * price]
      );
    }

    const invoice = await db.query(`
      SELECT i.*, c.name as client_name, c.company as client_company,
             c.email as client_email, c.address as client_address
      FROM invoices i JOIN clients c ON i.client_id = c.id WHERE i.id = $1
    `, [req.params.id]);
    const savedItems = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);

    res.json({ ...invoice.rows[0], items: savedItems.rows });
  } catch (err) {
    console.error('Update invoice error:', err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// PATCH /api/invoices/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const existing = await db.query('SELECT id FROM invoices WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    await db.query('UPDATE invoices SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await db.query('SELECT id FROM invoices WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    await db.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;
