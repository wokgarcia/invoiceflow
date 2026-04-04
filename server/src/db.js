const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
const isLocal = !dbUrl ||
  dbUrl.includes('localhost') ||
  dbUrl.includes('127.0.0.1') ||
  dbUrl.includes('.railway.internal');

const pool = new Pool({
  connectionString: dbUrl || undefined,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      business_name TEXT DEFAULT '',
      business_address TEXT DEFAULT '',
      business_email TEXT DEFAULT '',
      business_phone TEXT DEFAULT '',
      default_tax_rate REAL DEFAULT 0,
      default_payment_terms TEXT DEFAULT 'Net 30',
      stripe_customer_id TEXT DEFAULT '',
      stripe_subscription_id TEXT DEFAULT '',
      plan TEXT DEFAULT 'free',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      company TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      invoice_number TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      currency TEXT DEFAULT 'USD',
      tax_rate REAL DEFAULT 0,
      payment_terms TEXT DEFAULT 'Net 30',
      issue_date TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );
  `);
}

initDb().catch(err => console.error('DB init error:', err));

module.exports = { query: (text, params) => pool.query(text, params) };
