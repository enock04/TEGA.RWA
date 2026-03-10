'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { stationsApi } from '@/lib/api';

const PROVINCES = ['Kigali', 'Northern', 'Southern', 'Eastern', 'Western'];
const EMPTY = { name: '', city: '', province: '', address: '' };

export default function AdminStationsPage() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    stationsApi.getAll()
      .then(res => setStations(res.data.data.stations ?? []))
      .catch(() => toast.error('Failed to load stations'))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ name: s.name, city: s.city, province: s.province, address: s.address ?? '' }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name || !form.city || !form.province) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      if (editing) {
        // Update existing station
        const res = await (stationsApi as any).update(editing.id, form);
        setStations(s => s.map(x => x.id === editing.id ? res.data.data.station : x));
        toast.success('Station updated');
      } else {
        // Create new station
        const res = await (stationsApi as any).create(form);
        setStations(s => [res.data.data.station, ...s]);
        toast.success('Station created');
      }
      closeForm();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save station'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this station? This cannot be undone.')) return;
    try {
      await (stationsApi as any).delete(id);
      setStations(s => s.filter(x => x.id !== id));
      toast.success('Station deleted');
    } catch { toast.error('Failed to delete station'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Stations</h1>
        <button onClick={openCreate} className="btn-primary text-sm">+ Add Station</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Station' : 'New Station'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Station Name *</label>
              <input className="input-field" placeholder="e.g. Nyabugogo Bus Terminal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">City *</label>
              <input className="input-field" placeholder="e.g. Kigali" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="label">Province *</label>
              <select className="input-field" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}>
                <option value="">Select province</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input-field" placeholder="e.g. KN 4 Ave, Nyarugenge" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              {saving ? <Spinner size="sm" /> : null} {editing ? 'Update Station' : 'Save Station'}
            </button>
            <button onClick={closeForm} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : stations.length === 0 ? (
        <EmptyState title="No stations yet" description="Add stations to create routes." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Name', 'City', 'Province', 'Address', ''].map(h =>
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stations.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.city}</td>
                  <td className="px-4 py-3 text-gray-500">{s.province}</td>
                  <td className="px-4 py-3 text-gray-500">{s.address ?? '—'}</td>
                  <td className="px-4 py-3 text-right flex gap-3 justify-end">
                    <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
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
