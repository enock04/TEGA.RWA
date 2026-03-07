'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { schedulesApi, busesApi, routesApi } from '@/lib/api';

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ busId: '', routeId: '', departureTime: '', arrivalTime: '', basePrice: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([schedulesApi.getAll(), busesApi.getAll(), routesApi.getAll()])
      .then(([s, b, r]) => { setSchedules(s.data.data.schedules); setBuses(b.data.data.buses); setRoutes(r.data.data.routes); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.busId || !form.routeId || !form.departureTime || !form.arrivalTime || !form.basePrice) { toast.error('Fill all required fields'); return; }
    setSaving(true);
    try {
      const res = await schedulesApi.create({ ...form, basePrice: +form.basePrice });
      setSchedules(s => [res.data.data.schedule, ...s]);
      setShowForm(false);
      setForm({ busId: '', routeId: '', departureTime: '', arrivalTime: '', basePrice: '' });
      toast.success('Schedule created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create schedule'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this schedule?')) return;
    try { await schedulesApi.cancel(id); setSchedules(s => s.filter(x => x.id !== id)); toast.success('Schedule cancelled'); }
    catch { toast.error('Failed to cancel schedule'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Schedules</h1>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">+ Add Schedule</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">New Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Bus *</label>
              <select className="input-field" value={form.busId} onChange={e => setForm(f => ({ ...f, busId: e.target.value }))}>
                <option value="">Select bus</option>
                {buses.map(b => <option key={b.id} value={b.id}>{b.name} ({b.plate_number})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Route *</label>
              <select className="input-field" value={form.routeId} onChange={e => setForm(f => ({ ...f, routeId: e.target.value }))}>
                <option value="">Select route</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Departure Time *</label>
              <input type="datetime-local" className="input-field" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} />
            </div>
            <div>
              <label className="label">Arrival Time *</label>
              <input type="datetime-local" className="input-field" value={form.arrivalTime} onChange={e => setForm(f => ({ ...f, arrivalTime: e.target.value }))} />
            </div>
            <div>
              <label className="label">Price (RWF) *</label>
              <input type="number" className="input-field" placeholder="e.g. 3500" value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">{saving ? <Spinner size="sm" /> : null} Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : schedules.length === 0 ? (
        <EmptyState title="No schedules yet" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Route', 'Bus', 'Departure', 'Arrival', 'Price', 'Seats', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schedules.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.route_name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.bus_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{format(new Date(s.departure_time), 'dd MMM, HH:mm')}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{format(new Date(s.arrival_time), 'dd MMM, HH:mm')}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">RWF {Number(s.base_price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{s.available_seats}/{s.total_seats}</td>
                    <td className="px-4 py-3"><Badge label={s.status} status={s.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {s.status === 'active' && <button onClick={() => handleCancel(s.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
