# InvoiceFlow

A full-stack freelance invoice generator built with React, Node.js/Express, and SQLite.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **PDF:** pdfkit
- **Auth:** JWT

## Quick Start

### 1. Install all dependencies

```bash
npm run install:all
```

### 2. Seed the database with demo data

```bash
npm run seed
```

This creates:
- Demo user: `demo@test.com` / `demo1234`
- 2 sample clients
- 2 sample invoices

### 3. Start development servers

```bash
npm run dev
```

- **Client:** http://localhost:5173
- **Server:** http://localhost:5000

## Features

- **Auth** — JWT-based register/login
- **Clients** — Add, edit, delete clients
- **Invoices** — Create invoices with line items, auto-calculated totals, tax, and currency support
- **PDF Export** — Professional PDF export for any invoice
- **Dashboard** — Revenue summary cards and recent invoice table
- **Settings** — Business profile and defaults

## Project Structure

```
InvoiceFlow/
├── client/          # React + Vite frontend
├── server/          # Express API
├── data/            # SQLite database (auto-created)
└── package.json     # Root monorepo config
```

## Environment

The server reads from `server/.env` (optional). Defaults:
- `PORT=5000`
- `JWT_SECRET=invoiceflow_secret_key`
