const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };

function fmt(amount, currency = 'USD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${parseFloat(amount || 0).toFixed(2)}`;
}

// GET /api/pdf/:id
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

  const user = db.prepare(
    'SELECT business_name, business_address, business_email, business_phone FROM users WHERE id = ?'
  ).get(req.user.id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  const BLUE = '#2563EB';
  const DARK = '#111827';
  const GRAY = '#6B7280';
  const LIGHT_GRAY = '#F3F4F6';
  const pageWidth = doc.page.width - 100; // accounting for margins

  // ── Header bar ──────────────────────────────────────────────
  doc.rect(50, 45, pageWidth, 80).fill(BLUE);

  // "INVOICE" text (left side of header)
  doc.fillColor('white').fontSize(28).font('Helvetica-Bold')
    .text('INVOICE', 70, 65);

  // Business name (right side of header)
  const bizName = user.business_name || 'Your Business';
  doc.fontSize(13).font('Helvetica-Bold')
    .text(bizName, 70, 65, { width: pageWidth - 40, align: 'right' });

  doc.fontSize(9).font('Helvetica')
    .text(user.business_address || '', 70, 83, { width: pageWidth - 40, align: 'right' })
    .text([user.business_email, user.business_phone].filter(Boolean).join('  ·  '), 70, 95, { width: pageWidth - 40, align: 'right' });

  // ── Invoice meta block ───────────────────────────────────────
  let y = 150;

  // Status badge
  const statusColors = { Draft: '#6B7280', Sent: '#2563EB', Paid: '#16A34A', Overdue: '#DC2626' };
  const statusColor = statusColors[invoice.status] || '#6B7280';
  doc.roundedRect(50, y, 70, 20, 4).fill(statusColor);
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
    .text(invoice.status.toUpperCase(), 50, y + 5, { width: 70, align: 'center' });

  // Invoice number, dates (right aligned)
  const metaX = 350;
  doc.fillColor(GRAY).fontSize(9).font('Helvetica')
    .text('Invoice Number', metaX, y, { width: 200, align: 'right' })
    .text('Issue Date', metaX, y + 16, { width: 200, align: 'right' })
    .text('Due Date', metaX, y + 32, { width: 200, align: 'right' });

  doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
    .text(invoice.invoice_number, metaX, y, { width: 200, align: 'right' })
    .text(invoice.issue_date || '—', metaX, y + 16, { width: 200, align: 'right' })
    .text(invoice.due_date || '—', metaX, y + 32, { width: 200, align: 'right' });

  // ── Bill To ─────────────────────────────────────────────────
  y = 215;
  doc.fillColor(GRAY).fontSize(9).font('Helvetica-Bold').text('BILL TO', 50, y);
  y += 14;
  doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text(invoice.client_name, 50, y);
  y += 15;
  doc.fontSize(9).font('Helvetica').fillColor(GRAY);
  if (invoice.client_company) { doc.text(invoice.client_company, 50, y); y += 13; }
  if (invoice.client_address) { doc.text(invoice.client_address, 50, y); y += 13; }
  if (invoice.client_email) { doc.text(invoice.client_email, 50, y); y += 13; }

  // ── Line items table ─────────────────────────────────────────
  y = Math.max(y + 20, 320);

  // Table header
  doc.rect(50, y, pageWidth, 24).fill(BLUE);
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
  doc.text('DESCRIPTION', 60, y + 7, { width: 240 });
  doc.text('QTY', 305, y + 7, { width: 55, align: 'right' });
  doc.text('UNIT PRICE', 365, y + 7, { width: 80, align: 'right' });
  doc.text('AMOUNT', 450, y + 7, { width: pageWidth - 400, align: 'right' });
  y += 24;

  // Rows
  items.forEach((item, idx) => {
    const rowH = 28;
    if (idx % 2 === 0) {
      doc.rect(50, y, pageWidth, rowH).fill(LIGHT_GRAY);
    }
    doc.fillColor(DARK).fontSize(9).font('Helvetica');
    doc.text(item.description, 60, y + 9, { width: 240 });
    doc.text(String(item.quantity), 305, y + 9, { width: 55, align: 'right' });
    doc.text(fmt(item.unit_price, invoice.currency), 365, y + 9, { width: 80, align: 'right' });
    doc.text(fmt(item.amount, invoice.currency), 450, y + 9, { width: pageWidth - 400, align: 'right' });
    y += rowH;
  });

  // Divider
  y += 10;
  doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
  y += 15;

  // ── Totals ───────────────────────────────────────────────────
  const totalsX = 360;
  const totalsW = pageWidth - 310;

  doc.fillColor(GRAY).fontSize(9).font('Helvetica')
    .text('Subtotal', totalsX, y, { width: totalsW, align: 'right' });
  doc.fillColor(DARK).fontSize(9).font('Helvetica')
    .text(fmt(invoice.subtotal, invoice.currency), totalsX, y, { width: totalsW + 50, align: 'right' });
  y += 15;

  if (parseFloat(invoice.tax_rate) > 0) {
    doc.fillColor(GRAY).text(`Tax (${invoice.tax_rate}%)`, totalsX, y, { width: totalsW, align: 'right' });
    doc.fillColor(DARK).text(fmt(invoice.tax_amount, invoice.currency), totalsX, y, { width: totalsW + 50, align: 'right' });
    y += 15;
  }

  // Total row
  y += 5;
  doc.rect(totalsX - 10, y - 5, totalsW + 60, 30).fill(BLUE);
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
    .text('TOTAL', totalsX, y + 4, { width: totalsW, align: 'right' })
    .text(fmt(invoice.total, invoice.currency), totalsX, y + 4, { width: totalsW + 50, align: 'right' });
  y += 40;

  // ── Payment terms & notes ─────────────────────────────────────
  if (invoice.payment_terms) {
    doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold').text('PAYMENT TERMS', 50, y);
    y += 12;
    doc.fillColor(DARK).fontSize(9).font('Helvetica').text(invoice.payment_terms, 50, y);
    y += 20;
  }

  if (invoice.notes) {
    doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold').text('NOTES', 50, y);
    y += 12;
    doc.fillColor(DARK).fontSize(9).font('Helvetica').text(invoice.notes, 50, y, { width: pageWidth });
    y += 30;
  }

  // ── Footer ───────────────────────────────────────────────────
  const footerY = doc.page.height - 60;
  doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).strokeColor('#E5E7EB').lineWidth(1).stroke();
  doc.fillColor(GRAY).fontSize(8).font('Helvetica')
    .text('Thank you for your business!', 50, footerY + 10, { width: pageWidth, align: 'center' });

  doc.end();
});

module.exports = router;
