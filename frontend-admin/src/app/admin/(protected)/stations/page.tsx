'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { stationsApi } from '@/lib/api';
import { Station } from '@/types';

const PROVINCES = ['Kigali', 'Northern', 'Southern', 'Eastern', 'Western'];
const EMPTY = { name: '', city: '', province: '', address: '' };
type StationForm = typeof EMPTY;

export default function AdminStationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form, setForm] = useState<StationForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    stationsApi.getAll()
      .then(res => setStations(res.data.data.stations ?? []))
      .catch(() => toast.error('Failed to load stations'))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s: Station) => { setEditing(s); setForm({ name: s.name, city: s.city, province: s.province, address: s.address ?? '' }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name || !form.city || !form.province) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      if (editing) {
        const res = await stationsApi.update(editing.id, form);
        setStations(s => s.map(x => x.id === editing.id ? res.data.data.station : x));
        toast.success('Station updated');
      } else {
        const res = await stationsApi.create(form);
        setStations(s => [res.data.data.station, ...s]);
        toast.success('Station created');
      }
      closeForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save station';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((err as any).response?.data?.message || msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this station? This cannot be undone.')) return;
    try {
      await stationsApi.delete(id);
      setStations(s => s.filter(x => x.id !== id));
      toast.success('Station deleted');
    } catch { toast.error('Failed to delete station'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Stations</h1>
        <button type="button" onClick={openCreate} className="btn-admin-primary">+ Add Station</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Station' : 'New Station'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-admin">Station Name *</label>
              <input className="input-admin" placeholder="e.g. Nyabugogo Bus Terminal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">City *</label>
              <input className="input-admin" placeholder="e.g. Kigali" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Province *</label>
              <select title="Province" className="input-admin" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}>
                <option value="">Select province</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label-admin">Address</label>
              <input className="input-admin" placeholder="e.g. KN 4 Ave, Nyarugenge" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-admin-primary">
              {saving ? <Spinner size="sm" /> : null} {editing ? 'Update Station' : 'Save Station'}
            </button>
            <button type="button" onClick={closeForm} className="btn-admin-secondary">Cancel</button>
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
                    <button type="button" onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button type="button" onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
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
