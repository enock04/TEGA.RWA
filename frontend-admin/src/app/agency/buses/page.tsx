'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { busesApi } from '@/lib/api';
import { Bus, BusType } from '@/types';

const EMPTY = { name: '', plateNumber: '', busType: 'standard' as BusType, totalSeats: '' };
type BusForm = typeof EMPTY;

export default function AgencyBusesPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bus | null>(null);
  const [form, setForm] = useState<BusForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    busesApi.getAll()
      .then(res => setBuses(res.data.data.buses))
      .catch(() => toast.error('Failed to load buses'))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (b: Bus) => {
    setEditing(b);
    setForm({ name: b.name, plateNumber: b.plate_number, busType: b.bus_type, totalSeats: String(b.total_seats) });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Bus name is required'); return; }
    if (form.name.trim().length < 2) { toast.error('Bus name must be at least 2 characters'); return; }
    if (!form.plateNumber.trim()) { toast.error('Plate number is required'); return; }
    if (!form.totalSeats || +form.totalSeats < 1 || +form.totalSeats > 100) { toast.error('Total seats must be between 1 and 100'); return; }
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
        toast.success('Bus added');
      }
      closeForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save bus');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Buses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your fleet</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-admin-primary">+ Add Bus</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Bus' : 'New Bus'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-admin">Bus Name *</label>
              <input className="input-admin" placeholder="e.g. Virunga Express 01" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Plate Number *</label>
              <input className="input-admin" placeholder="e.g. RAB 001 A" value={form.plateNumber}
                onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Bus Type</label>
              <select title="Bus type" className="input-admin" value={form.busType}
                onChange={e => setForm(f => ({ ...f, busType: e.target.value as BusType }))}>
                {(['standard', 'luxury', 'minibus', 'coach'] as BusType[]).map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-admin">Total Seats *</label>
              <input type="number" className="input-admin" placeholder="e.g. 44" min="1" max="100"
                value={form.totalSeats} onChange={e => setForm(f => ({ ...f, totalSeats: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-admin-primary flex items-center gap-2">
              {saving && <Spinner size="sm" />} {editing ? 'Update Bus' : 'Save Bus'}
            </button>
            <button type="button" onClick={closeForm} className="btn-admin-secondary">Cancel</button>
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
              <tr>
                {['Name', 'Plate', 'Type', 'Seats', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {buses.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{b.plate_number}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{b.bus_type}</td>
                  <td className="px-4 py-3 text-gray-600">{b.total_seats}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(b)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
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
