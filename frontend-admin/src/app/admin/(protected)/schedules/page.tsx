'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { schedulesApi, busesApi, routesApi } from '@/lib/api';
import { Bus, Route } from '@/types';

interface AdminSchedule {
  id: string;
  bus_id: string;
  route_id: string;
  bus_name: string;
  route_name: string;
  departure_time: string;
  arrival_time: string;
  base_price: number | string;
  available_seats: number;
  total_seats: number;
  status: string;
}

const EMPTY_FORM = { busId: '', routeId: '', departureTime: '', arrivalTime: '', basePrice: '' };
type ScheduleForm = typeof EMPTY_FORM;

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<AdminSchedule[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminSchedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([schedulesApi.getAll(), busesApi.getAll(), routesApi.getAll()])
      .then(([s, b, r]) => { setSchedules(s.data.data.schedules); setBuses(b.data.data.buses); setRoutes(r.data.data.routes); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const toLocalInput = (iso: string) => iso ? iso.slice(0, 16) : '';

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (s: AdminSchedule) => {
    setEditing(s);
    setForm({ busId: s.bus_id, routeId: s.route_id, departureTime: toLocalInput(s.departure_time), arrivalTime: toLocalInput(s.arrival_time), basePrice: String(s.base_price) });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.busId || !form.routeId || !form.departureTime || !form.arrivalTime || !form.basePrice) { toast.error('Fill all required fields'); return; }
    if (new Date(form.arrivalTime) <= new Date(form.departureTime)) { toast.error('Arrival time must be after departure time'); return; }
    setSaving(true);
    try {
      const payload = { ...form, basePrice: +form.basePrice };
      if (editing) {
        const res = await schedulesApi.update(editing.id, payload);
        setSchedules(s => s.map(x => x.id === editing.id ? res.data.data.schedule : x));
        toast.success('Schedule updated');
      } else {
        const res = await schedulesApi.create(payload);
        setSchedules(s => [res.data.data.schedule, ...s]);
        toast.success('Schedule created');
      }
      closeForm();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((err as any).response?.data?.message || 'Failed to save schedule');
    } finally { setSaving(false); }
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
        <button type="button" onClick={openCreate} className="btn-admin-primary">+ Add Schedule</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Schedule' : 'New Schedule'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-admin">Bus *</label>
              <select title="Bus" className="input-admin" value={form.busId} onChange={e => setForm(f => ({ ...f, busId: e.target.value }))}>
                <option value="">Select bus</option>
                {buses.map(b => <option key={b.id} value={b.id}>{b.name} ({b.plate_number})</option>)}
              </select>
            </div>
            <div>
              <label className="label-admin">Route *</label>
              <select title="Route" className="input-admin" value={form.routeId} onChange={e => setForm(f => ({ ...f, routeId: e.target.value }))}>
                <option value="">Select route</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-admin">Departure Time *</label>
              <input type="datetime-local" title="Departure time" placeholder="YYYY-MM-DDTHH:MM" className="input-admin" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Arrival Time *</label>
              <input type="datetime-local" title="Arrival time" placeholder="YYYY-MM-DDTHH:MM" className="input-admin" value={form.arrivalTime} min={form.departureTime || undefined} onChange={e => setForm(f => ({ ...f, arrivalTime: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Price (RWF) *</label>
              <input type="number" title="Base price in RWF" className="input-admin" placeholder="e.g. 3500" value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-admin-primary">{saving ? <Spinner size="sm" /> : null} Save</button>
            <button type="button" onClick={closeForm} className="btn-admin-secondary">Cancel</button>
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
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-3">
                      {s.status === 'active' && <button type="button" onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>}
                      {s.status === 'active' && <button type="button" onClick={() => handleCancel(s.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Cancel</button>}
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
