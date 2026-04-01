require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

console.log('Seeding database...');

// Clear existing data
db.exec(`
  DELETE FROM invoice_items;
  DELETE FROM invoices;
  DELETE FROM clients;
  DELETE FROM users;
`);

// Create demo user
const hashedPassword = bcrypt.hashSync('demo1234', 10);
const insertUser = db.prepare(`
  INSERT INTO users (email, password, business_name, business_address, business_email, business_phone, default_tax_rate, default_payment_terms)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const user = insertUser.run(
  'demo@test.com',
  hashedPassword,
  'Acme Freelance Studio',
  '123 Main Street, San Francisco, CA 94105',
  'demo@test.com',
  '+1 (555) 000-1234',
  10,
  'Net 30'
);
const userId = user.lastInsertRowid;
console.log(`Created user: demo@test.com (id=${userId})`);

// Create sample clients
const insertClient = db.prepare(`
  INSERT INTO clients (user_id, name, email, address, company)
  VALUES (?, ?, ?, ?, ?)
`);
const client1 = insertClient.run(userId, 'Sarah Johnson', 'sarah@techcorp.io', '456 Market St, New York, NY 10001', 'TechCorp Inc.');
const client2 = insertClient.run(userId, 'Marcus Rivera', 'marcus@designstudio.com', '789 Broadway, Austin, TX 73301', 'Rivera Design Studio');
console.log(`Created clients: id=${client1.lastInsertRowid}, id=${client2.lastInsertRowid}`);

// Create sample invoices
const insertInvoice = db.prepare(`
  INSERT INTO invoices (user_id, client_id, invoice_number, status, currency, tax_rate, payment_terms, issue_date, due_date, notes, subtotal, tax_amount, total)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertItem = db.prepare(`
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
  VALUES (?, ?, ?, ?, ?)
`);

// Invoice 1 - Paid
const inv1 = insertInvoice.run(
  userId, client1.lastInsertRowid, 'INV-0001', 'Paid', 'USD', 10, 'Net 30',
  '2026-03-01', '2026-03-31',
  'Thank you for your business!',
  3500, 350, 3850
);
insertItem.run(inv1.lastInsertRowid, 'Website Redesign - UX/UI', 1, 2000, 2000);
insertItem.run(inv1.lastInsertRowid, 'Frontend Development', 10, 150, 1500);
console.log(`Created invoice INV-0001 (id=${inv1.lastInsertRowid})`);

// Invoice 2 - Sent
const inv2 = insertInvoice.run(
  userId, client2.lastInsertRowid, 'INV-0002', 'Sent', 'USD', 10, 'Net 30',
  '2026-03-15', '2026-04-14',
  'Payment due within 30 days.',
  1800, 180, 1980
);
insertItem.run(inv2.lastInsertRowid, 'Brand Identity Package', 1, 1200, 1200);
insertItem.run(inv2.lastInsertRowid, 'Logo Design Revisions', 3, 200, 600);
console.log(`Created invoice INV-0002 (id=${inv2.lastInsertRowid})`);

console.log('\nSeed complete!');
console.log('Login: demo@test.com / demo1234');
