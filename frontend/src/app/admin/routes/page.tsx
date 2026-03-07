'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { routesApi, stationsApi } from '@/lib/api';

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', departureStationId: '', arrivalStationId: '', distanceKm: '', durationMinutes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([routesApi.getAll(), stationsApi.getAll()])
      .then(([r, s]) => { setRoutes(r.data.data.routes); setStations(s.data.data.stations); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.departureStationId || !form.arrivalStationId) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      const res = await routesApi.create({ ...form, distanceKm: form.distanceKm ? +form.distanceKm : undefined, durationMinutes: form.durationMinutes ? +form.durationMinutes : undefined });
      setRoutes(r => [res.data.data.route, ...r]);
      setShowForm(false);
      setForm({ name: '', departureStationId: '', arrivalStationId: '', distanceKm: '', durationMinutes: '' });
      toast.success('Route created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create route'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this route?')) return;
    try { await routesApi.delete(id); setRoutes(r => r.filter(x => x.id !== id)); toast.success('Route deleted'); }
    catch { toast.error('Failed to delete route'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Routes</h1>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">+ Add Route</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">New Route</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Route Name *</label>
              <input className="input-field" placeholder="e.g. Kigali — Huye" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Departure Station *</label>
              <select className="input-field" value={form.departureStationId} onChange={e => setForm(f => ({ ...f, departureStationId: e.target.value }))}>
                <option value="">Select station</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Arrival Station *</label>
              <select className="input-field" value={form.arrivalStationId} onChange={e => setForm(f => ({ ...f, arrivalStationId: e.target.value }))}>
                <option value="">Select station</option>
                {stations.filter(s => s.id !== form.departureStationId).map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Distance (km)</label>
              <input type="number" className="input-field" placeholder="e.g. 130" value={form.distanceKm} onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))} />
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <input type="number" className="input-field" placeholder="e.g. 150" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">{saving ? <Spinner size="sm" /> : null} Save Route</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : routes.length === 0 ? (
        <EmptyState title="No routes yet" description="Add your first route to get started." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Name', 'From', 'To', 'Distance', 'Duration', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {routes.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.departure_station}</td>
                  <td className="px-4 py-3 text-gray-600">{r.arrival_station}</td>
                  <td className="px-4 py-3 text-gray-500">{r.distance_km ? `${r.distance_km} km` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.duration_minutes ? `${r.duration_minutes} min` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
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
