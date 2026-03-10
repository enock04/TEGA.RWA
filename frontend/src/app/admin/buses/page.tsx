'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { busesApi } from '@/lib/api';

const EMPTY = { name: '', plateNumber: '', busType: 'standard', totalSeats: '' };

export default function AdminBusesPage() {
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    busesApi.getAll()
      .then(res => setBuses(res.data.data.buses))
      .catch(() => toast.error('Failed to load buses'))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (b: any) => {
    setEditing(b);
    setForm({ name: b.name, plateNumber: b.plate_number, busType: b.bus_type, totalSeats: String(b.total_seats) });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name || !form.plateNumber || !form.totalSeats) { toast.error('Fill all required fields'); return; }
    setSaving(true);
    try {
      const payload = { ...form, totalSeats: +form.totalSeats };
      if (editing) {
        const res = await busesApi.update(editing.id, payload);
        setBuses(b => b.map(x => x.id === editing.id ? res.data.data.bus : x));
        toast.success('Bus updated');
      } else {
        const res = await busesApi.create(payload);
        setBuses(b => [res.data.data.bus, ...b]);
        toast.success('Bus created');
      }
      closeForm();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save bus'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bus?')) return;
    try { await busesApi.delete(id); setBuses(b => b.filter(x => x.id !== id)); toast.success('Bus deleted'); }
    catch { toast.error('Failed to delete bus'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Buses</h1>
        <button onClick={openCreate} className="btn-primary text-sm">+ Add Bus</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Bus' : 'New Bus'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Bus Name *</label>
              <input className="input-field" placeholder="e.g. Virunga Express 01" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Plate Number *</label>
              <input className="input-field" placeholder="e.g. RAB 001 A" value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value }))} />
            </div>
            <div>
              <label className="label">Bus Type</label>
              <select className="input-field" value={form.busType} onChange={e => setForm(f => ({ ...f, busType: e.target.value }))}>
                {['standard', 'luxury', 'minibus', 'coach'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Total Seats *</label>
              <input type="number" className="input-field" placeholder="e.g. 44" min="1" max="100" value={form.totalSeats} onChange={e => setForm(f => ({ ...f, totalSeats: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">{saving ? <Spinner size="sm" /> : null} {editing ? 'Update Bus' : 'Save Bus'}</button>
            <button onClick={closeForm} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : buses.length === 0 ? (
        <EmptyState title="No buses yet" description="Add your first bus to get started." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Name', 'Plate', 'Type', 'Seats', 'Agency', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {buses.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{b.plate_number}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{b.bus_type}</td>
                  <td className="px-4 py-3 text-gray-600">{b.total_seats}</td>
                  <td className="px-4 py-3 text-gray-500">{b.agency_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right flex gap-3 justify-end">
                    <button onClick={() => openEdit(b)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button onClick={() => handleDelete(b.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
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
