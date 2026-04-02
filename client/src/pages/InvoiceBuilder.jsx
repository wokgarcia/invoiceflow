import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';


const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };

function newItem() {
  return { description: '', quantity: 1, unit_price: 0 };
}

export default function InvoiceBuilder() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: '',
    invoice_number: '',
    status: 'Draft',
    currency: 'USD',
    tax_rate: 0,
    payment_terms: 'Net 30',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    notes: '',
  });
  const [items, setItems] = useState([newItem()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [limitHit, setLimitHit] = useState(false);

  // Load clients + defaults
  useEffect(() => {
    const loadClients = api.get('/clients');
    const loadSettings = api.get('/settings');

    Promise.all([loadClients, loadSettings]).then(([cRes, sRes]) => {
      setClients(cRes.data);
      if (!isEditing) {
        setForm(f => ({
          ...f,
          tax_rate: sRes.data.default_tax_rate ?? 0,
          payment_terms: sRes.data.default_payment_terms || 'Net 30',
        }));
      }
    });
  }, [isEditing]);

  // Load invoice if editing
  useEffect(() => {
    if (!isEditing) {
      // Get next invoice number
      api.get('/invoices/next-number').then(res => {
        setForm(f => ({ ...f, invoice_number: res.data.invoiceNumber }));
      }).finally(() => setLoading(false));
      return;
    }

    api.get(`/invoices/${id}`).then(res => {
      const inv = res.data;
      setForm({
        client_id: String(inv.client_id),
        invoice_number: inv.invoice_number,
        status: inv.status,
        currency: inv.currency,
        tax_rate: inv.tax_rate,
        payment_terms: inv.payment_terms,
        issue_date: inv.issue_date || '',
        due_date: inv.due_date || '',
        notes: inv.notes || '',
      });
      setItems(inv.items.length > 0 ? inv.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })) : [newItem()]);
    }).catch(() => navigate('/invoices')).finally(() => setLoading(false));
  }, [id, isEditing, navigate]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const setItem = (idx, field, value) => {
    setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(items => [...items, newItem()]);
  const removeItem = idx => setItems(items => items.filter((_, i) => i !== idx));

  // Computed totals
  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  }, 0);
  const taxAmount = subtotal * (parseFloat(form.tax_rate) / 100);
  const total = subtotal + taxAmount;

  const sym = CURRENCY_SYMBOLS[form.currency] || '$';

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.client_id) { setError('Please select a client'); return; }
    if (items.every(i => !i.description)) { setError('Add at least one line item'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: parseInt(form.client_id),
        items: items.filter(i => i.description),
      };
      if (isEditing) {
        await api.put(`/invoices/${id}`, payload);
        navigate(`/invoices/${id}`);
      } else {
        const res = await api.post('/invoices', payload);
        navigate(`/invoices/${res.data.id}`);
      }
    } catch (err) {
      if (err.response?.data?.upgrade) {
        setLimitHit(true);
      } else {
        setError(err.response?.data?.error || 'Failed to save invoice');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/invoices" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Invoice' : 'New Invoice'}</h1>
      </div>

      {limitHit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-800 text-sm">You've reached the free plan limit</p>
            <p className="text-amber-700 text-sm mt-0.5">Upgrade to Pro to create unlimited invoices for just $9/month.</p>
          </div>
          <Link
            to="/billing"
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top meta row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Client + Invoice details */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Invoice Details</h2>

            <div>
              <label className="label">Client <span className="text-red-500">*</span></label>
              {clients.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No clients yet.{' '}
                  <Link to="/clients/new" className="text-primary-600 underline">Add one first.</Link>
                </p>
              ) : (
                <select
                  className="input"
                  value={form.client_id}
                  onChange={e => set('client_id', e.target.value)}
                  required
                >
                  <option value="">Select a client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Invoice Number</label>
                <input
                  className="input"
                  value={form.invoice_number}
                  onChange={e => set('invoice_number', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {['Draft', 'Sent', 'Paid', 'Overdue'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Issue Date</label>
                <input type="date" className="input" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input type="date" className="input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Right: Financial details */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Financial</h2>

            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>

            <div>
              <label className="label">Tax Rate (%)</label>
              <input
                type="number"
                className="input"
                min="0"
                max="100"
                step="0.01"
                value={form.tax_rate}
                onChange={e => set('tax_rate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="label">Payment Terms</label>
              <select className="input" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}>
                {['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Any additional notes for the client…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Line Items</h2>

          {/* Header row */}
          <div className="hidden md:grid grid-cols-12 gap-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-right">Quantity</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
              return (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 md:col-span-5">
                    <input
                      className="input"
                      placeholder="Service description…"
                      value={item.description}
                      onChange={e => setItem(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      className="input text-right"
                      min="0"
                      step="0.01"
                      placeholder="1"
                      value={item.quantity}
                      onChange={e => setItem(idx, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
                      <input
                        type="number"
                        className="input pl-6 text-right"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={e => setItem(idx, 'unit_price', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-right font-medium text-gray-700 dark:text-gray-300 pr-1">
                    {sym}{amount.toFixed(2)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="w-7 h-7 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Line Item
          </button>

          {/* Totals */}
          <div className="mt-6 border-t border-gray-100 pt-6 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{sym}{subtotal.toFixed(2)}</span>
              </div>
              {parseFloat(form.tax_rate) > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax ({form.tax_rate}%)</span>
                  <span>{sym}{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base border-t border-gray-200 dark:border-gray-700 pt-2">
                <span>Total</span>
                <span>{sym}{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link to="/invoices" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
