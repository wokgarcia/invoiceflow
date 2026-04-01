import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    business_name: '',
    business_address: '',
    business_email: '',
    business_phone: '',
    default_tax_rate: 0,
    default_payment_terms: 'Net 30',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings').then(res => {
      const d = res.data;
      setForm({
        business_name: d.business_name || '',
        business_address: d.business_address || '',
        business_email: d.business_email || '',
        business_phone: d.business_phone || '',
        default_tax_rate: d.default_tax_rate ?? 0,
        default_payment_terms: d.default_payment_terms || 'Net 30',
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      await api.put('/settings', form);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Your business profile and invoice defaults.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Info */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Business Information</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Business Name</label>
              <input
                className="input"
                placeholder="Acme Freelance Studio"
                value={form.business_name}
                onChange={e => set('business_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Business Address</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="123 Main St, City, State ZIP"
                value={form.business_address}
                onChange={e => set('business_address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Business Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@business.com"
                  value={form.business_email}
                  onChange={e => set('business_email', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  className="input"
                  placeholder="+1 (555) 000-0000"
                  value={form.business_phone}
                  onChange={e => set('business_phone', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Defaults */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Invoice Defaults</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Default Tax Rate (%)</label>
              <input
                type="number"
                className="input"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                value={form.default_tax_rate}
                onChange={e => set('default_tax_rate', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">Default Payment Terms</label>
              <select
                className="input"
                value={form.default_payment_terms}
                onChange={e => set('default_payment_terms', e.target.value)}
              >
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 45</option>
                <option>Net 60</option>
                <option>Due on Receipt</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">Settings saved successfully.</div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
