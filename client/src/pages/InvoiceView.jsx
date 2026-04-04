import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };
function fmt(n, currency = 'USD') {
  return `${CURRENCY_SYMBOLS[currency] || '$'}${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue'];

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusMenuRef = useRef(null);

  useEffect(() => {
    if (!showStatusMenu) return;
    const handler = e => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStatusMenu]);

  useEffect(() => {
    api.get(`/invoices/${id}`)
      .then(res => setInvoice(res.data))
      .catch(() => navigate('/invoices'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleStatusChange = async status => {
    setShowStatusMenu(false);
    setUpdatingStatus(true);
    try {
      await api.patch(`/invoices/${id}/status`, { status });
      setInvoice(inv => ({ ...inv, status }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const base = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${base}/pdf/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    setEmailMsg('');
    setEmailSuccess(false);
    try {
      const res = await api.post(`/email/${id}`);
      setEmailSuccess(true);
      setEmailMsg(res.data.message);
      if (invoice.status === 'Draft') {
        setInvoice(inv => ({ ...inv, status: 'Sent' }));
      }
    } catch (err) {
      setEmailSuccess(false);
      setEmailMsg(err.response?.data?.error || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    try {
      await api.delete(`/invoices/${id}`);
      navigate('/invoices');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!invoice) return null;

  const sym = CURRENCY_SYMBOLS[invoice.currency] || '$';

  return (
    <div className="p-8 max-w-4xl page-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link to="/invoices" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {invoice.client_name}{invoice.client_company ? ` · ${invoice.client_company}` : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Status dropdown */}
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => setShowStatusMenu(v => !v)}
              disabled={updatingStatus}
              className="btn-secondary text-sm"
            >
              {updatingStatus ? 'Updating…' : 'Change Status'}
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1 animate-scale-in">
                {STATUSES.filter(s => s !== invoice.status).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Mark as {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link to={`/invoices/${id}/edit`} className="btn-secondary text-sm">Edit</Link>

          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="btn-secondary text-sm"
          >
            {sending ? 'Sending…' : '✉ Send Email'}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn-primary text-sm"
          >
            {downloading ? 'Generating…' : '↓ Export PDF'}
          </button>

          <button
            onClick={handleDelete}
            className="btn-ghost text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Email feedback */}
      {emailMsg && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm border ${
          emailSuccess
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
        }`}>
          {emailMsg}
        </div>
      )}

      {/* Invoice card */}
      <div className="card overflow-hidden">
        {/* Blue header */}
        <div className="bg-primary-600 px-8 py-6 flex justify-between items-start">
          <div>
            <p className="text-primary-200 text-xs font-semibold uppercase tracking-wide mb-1">Invoice</p>
            <p className="text-white text-2xl font-bold">{invoice.invoice_number}</p>
          </div>
          <div className="text-right text-sm text-primary-100 space-y-1">
            <div><span className="opacity-70">Issued:</span> <span className="font-medium text-white">{invoice.issue_date || '—'}</span></div>
            <div><span className="opacity-70">Due:</span> <span className="font-medium text-white">{invoice.due_date || '—'}</span></div>
            <div><span className="opacity-70">Terms:</span> <span className="font-medium text-white">{invoice.payment_terms}</span></div>
          </div>
        </div>

        <div className="p-8">
          {/* Client info */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
            <p className="font-semibold text-gray-900 dark:text-white">{invoice.client_name}</p>
            {invoice.client_company && <p className="text-gray-500 dark:text-gray-400 text-sm">{invoice.client_company}</p>}
            {invoice.client_address && <p className="text-gray-500 dark:text-gray-400 text-sm">{invoice.client_address}</p>}
            {invoice.client_email && <p className="text-gray-500 dark:text-gray-400 text-sm">{invoice.client_email}</p>}
          </div>

          {/* Line items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-y border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{fmt(item.unit_price, invoice.currency)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmt(item.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{fmt(invoice.subtotal, invoice.currency)}</span>
              </div>
              {parseFloat(invoice.tax_rate) > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span>{fmt(invoice.tax_amount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <span>Total</span>
                <span className="text-primary-700 dark:text-primary-400">{fmt(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Notes</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
