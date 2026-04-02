const { Database: WasmDatabase } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/invoiceflow.db');
const dataDir = path.dirname(DB_PATH);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Compatibility wrapper: node-sqlite3-wasm requires params as an array,
// but better-sqlite3 (and our code) uses spread args. This wrapper normalises both.
class CompatStatement {
  constructor(stmt) {
    this._stmt = stmt;
  }
  _params(args) {
    // stmt.run(p1, p2) → [p1, p2]  |  stmt.run([p1, p2]) → [p1, p2]
    if (args.length === 0) return [];
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    return args;
  }
  run(...args)  { return this._stmt.run(this._params(args)); }
  get(...args)  { return this._stmt.get(this._params(args)); }
  all(...args)  { return this._stmt.all(this._params(args)); }
}

class CompatDatabase {
  constructor(dbPath) {
    this._db = new WasmDatabase(dbPath);
  }
  exec(sql)     { return this._db.exec(sql); }
  prepare(sql)  { return new CompatStatement(this._db.prepare(sql)); }
}

const db = new CompatDatabase(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    company TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );
`);

module.exports = db;
