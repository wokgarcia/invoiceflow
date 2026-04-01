import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api';

export default function ClientForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', address: '', company: '' });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing) return;
    api.get(`/clients/${id}`)
      .then(res => setForm({
        name: res.data.name || '',
        email: res.data.email || '',
        address: res.data.address || '',
        company: res.data.company || '',
      }))
      .catch(() => navigate('/clients'))
      .finally(() => setLoading(false));
  }, [id, isEditing, navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/clients/${id}`, form);
      } else {
        await api.post('/clients', form);
      }
      navigate('/clients');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save client');
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
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/clients" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Client' : 'New Client'}</h1>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
          )}

          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="Jane Smith"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Company</label>
            <input
              className="input"
              placeholder="Acme Corp"
              value={form.company}
              onChange={e => set('company', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="jane@acme.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Address</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="123 Main St, City, State ZIP"
              value={form.address}
              onChange={e => set('address', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/clients" className="btn-secondary">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
