require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const invoiceRoutes = require('./routes/invoices');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const pdfRoutes = require('./routes/pdf');
const stripeRoutes = require('./routes/stripe');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 5000;

// Stripe webhook needs raw body — must be before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/email', emailRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

function autoSeed() {
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
    if (count.c === 0) {
      console.log('Empty database detected — seeding demo data...');
      require('./seed');
    }
  } catch (e) {
    console.error('Auto-seed error:', e.message);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`InvoiceFlow server running on port ${PORT}`);
  autoSeed();
});
