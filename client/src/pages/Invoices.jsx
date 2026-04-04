import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };
function fmt(n, currency = 'USD') {
  return `${CURRENCY_SYMBOLS[currency] || '$'}${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUSES = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'];

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    api.get('/invoices').then(res => setInvoices(res.data)).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, num) => {
    if (!window.confirm(`Delete invoice ${num}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(v => v.filter(x => x.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filter === 'All' ? invoices : invoices.filter(i => i.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up stagger-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/invoices/new" className="btn-primary">+ New Invoice</Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit animate-fade-in-up stagger-2">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              filter === s
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm scale-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-600/50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center animate-scale-in">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {invoices.length === 0 ? 'No invoices yet.' : `No ${filter.toLowerCase()} invoices.`}
          </p>
          {invoices.length === 0 && (
            <Link to="/invoices/new" className="btn-primary mt-4 inline-flex">Create Invoice</Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-in-up stagger-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Invoice #</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Client</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Issue Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Due Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-150 animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
                >
                  <td className="px-6 py-4">
                    <Link to={`/invoices/${inv.id}`} className="font-medium text-primary-600 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    <div className="font-medium">{inv.client_name}</div>
                    {inv.client_company && <div className="text-xs text-gray-400 dark:text-gray-500">{inv.client_company}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{inv.issue_date || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{inv.due_date || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{fmt(inv.total, inv.currency)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/invoices/${inv.id}/edit`} className="btn-ghost text-xs py-1 px-2">Edit</Link>
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        disabled={deletingId === inv.id}
                        className="btn-ghost text-xs py-1 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                      >
                        {deletingId === inv.id ? (
                          <span className="animate-pulse">...</span>
                        ) : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
