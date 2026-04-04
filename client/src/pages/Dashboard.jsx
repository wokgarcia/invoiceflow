import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };
function fmt(n, currency = 'USD') {
  return `${CURRENCY_SYMBOLS[currency] || '$'}${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const numeric = parseFloat(String(target).replace(/[^0-9.]/g, ''));
    if (isNaN(numeric) || numeric === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(numeric * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function StatCard({ title, value, color, iconColor, icon, index, isCurrency, currency }) {
  const numeric = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  const animated = useCountUp(isNaN(numeric) ? 0 : numeric);
  const displayValue = isCurrency
    ? fmt(animated, currency)
    : isNaN(numeric)
    ? value
    : Math.round(animated);

  return (
    <div
      className={`card-hover p-6 animate-fade-in-up stagger-${index}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} transition-transform duration-200 hover:scale-110`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{displayValue}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      </div>
    );
  }

  const { stats, recent } = data;

  return (
    <div className="p-8 page-enter">
      {/* Page header */}
      <div className="mb-8 animate-fade-in-up stagger-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back{user?.business_name ? `, ${user.business_name}` : ''}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Here's what's happening with your invoices.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          index={1}
          title="Total Revenue"
          value={stats.total_revenue}
          isCurrency
          color="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          index={2}
          title="Outstanding"
          value={stats.outstanding}
          isCurrency
          color="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          index={3}
          title="Overdue"
          value={stats.overdue}
          isCurrency
          color="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <StatCard
          index={4}
          title="Total Invoices"
          value={stats.total_invoices}
          color="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
      </div>

      {/* Recent invoices */}
      <div className="card animate-fade-in-up stagger-5">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Invoices</h2>
          <Link to="/invoices/new" className="btn-primary text-xs py-1.5 px-3">
            + New Invoice
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">No invoices yet.</p>
            <Link to="/invoices/new" className="btn-primary mt-4 inline-flex">Create your first invoice</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Invoice</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Due Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {recent.map((inv, i) => (
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
                      <div>{inv.client_name}</div>
                      {inv.client_company && <div className="text-xs text-gray-400 dark:text-gray-500">{inv.client_company}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{inv.due_date || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{fmt(inv.total, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
