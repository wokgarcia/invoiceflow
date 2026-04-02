import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    api.get('/stripe/status').then(res => setStatus(res.data)).finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await api.post('/stripe/checkout');
      window.location.href = res.data.url;
    } catch (err) {
      alert('Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await api.post('/stripe/portal');
      window.location.href = res.data.url;
    } catch (err) {
      alert('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const isPro = status?.plan === 'pro';

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your plan and subscription.</p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
          🎉 You're now on Pro! Enjoy unlimited invoices.
        </div>
      )}
      {canceled && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
          Checkout canceled — you're still on the free plan.
        </div>
      )}

      {/* Current plan */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Current Plan</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{isPro ? 'Pro' : 'Free'}</p>
              {isPro && (
                <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">Active</span>
              )}
            </div>
            {!isPro && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {status?.invoiceCount ?? 0} / 3 invoices used
              </p>
            )}
            {isPro && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Unlimited invoices · $9/month</p>
            )}
          </div>
          {isPro && (
            <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary text-sm">
              {portalLoading ? 'Loading…' : 'Manage Subscription'}
            </button>
          )}
        </div>

        {!isPro && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-1">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(((status?.invoiceCount ?? 0) / 3) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{3 - (status?.invoiceCount ?? 0)} invoice{3 - (status?.invoiceCount ?? 0) !== 1 ? 's' : ''} remaining on free plan</p>
          </div>
        )}
      </div>

      {/* Plans */}
      {!isPro && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free */}
          <div className="card p-6 opacity-60">
            <p className="font-semibold text-gray-900 dark:text-white mb-1">Free</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-4">$0<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {['Up to 3 invoices', 'Client management', 'PDF export', 'Basic dashboard'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <div className="w-full py-2 text-center text-sm text-gray-400 dark:text-gray-500 font-medium border border-gray-200 dark:border-gray-700 rounded-lg">Current plan</div>
            </div>
          </div>

          {/* Pro */}
          <div className="card p-6 border-primary-500 ring-2 ring-primary-500 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">Pro</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-4">$9<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {['Unlimited invoices', 'Client management', 'PDF export', 'Full dashboard', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <button onClick={handleUpgrade} disabled={checkoutLoading} className="btn-primary w-full">
                {checkoutLoading ? 'Loading…' : 'Upgrade to Pro →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
