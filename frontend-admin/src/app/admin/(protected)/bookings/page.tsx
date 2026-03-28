'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { bookingsApi, paymentsApi } from '@/lib/api';

interface Booking {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  route_name: string;
  departure_time: string | null;
  seat_number: string | number;
  amount: number | string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', date: '' });
  const [refunding, setRefunding] = useState<string | null>(null);
  const LIMIT = 20;

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getAll({ page, limit: LIMIT, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      setBookings(res.data.data.bookings);
      setTotal(res.data.data.total);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  const handleRefund = async (bookingId: string) => {
    if (!confirm('Refund this booking? This will cancel it and restore the seat.')) return;
    setRefunding(bookingId);
    try {
      await paymentsApi.refund(bookingId);
      setBookings(list => list.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking refunded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Refund failed');
    } finally {
      setRefunding(null);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadBookings(); }, [page, filters]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">All Bookings</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-4">
        <div>
          <label className="label-admin">Status</label>
          <div className="relative flex items-center">
            <select className="input-admin w-40 pr-8" title="Filter by status" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
              <option value="">All</option>
              {['pending','confirmed','cancelled','expired'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {filters.status && (
              <button
                type="button"
                onClick={() => { setFilters(f => ({ ...f, status: '' })); setPage(1); }}
                className="absolute right-2 text-gray-400 hover:text-gray-600"
                aria-label="Clear status"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="label-admin">Date</label>
          <div className="relative flex items-center">
            <input type="date" className="input-admin w-44 pr-8" value={filters.date} title="Filter by date" onChange={e => { setFilters(f => ({ ...f, date: e.target.value })); setPage(1); }} />
            {filters.date && (
              <button
                type="button"
                onClick={() => { setFilters(f => ({ ...f, date: '' })); setPage(1); }}
                className="absolute right-2 text-gray-400 hover:text-gray-600"
                aria-label="Clear date"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Passenger', 'Phone', 'Route', 'Departure', 'Seat', 'Amount', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.passenger_name}</td>
                    <td className="px-4 py-3 text-gray-600">{b.passenger_phone}</td>
                    <td className="px-4 py-3 text-gray-600">{b.route_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {b.departure_time ? format(new Date(b.departure_time), 'dd MMM, HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">#{b.seat_number}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">RWF {Number(b.amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge label={b.status} status={b.status} /></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {b.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleRefund(b.id)}
                          disabled={refunding === b.id}
                          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {refunding === b.id ? 'Refunding…' : 'Refund'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-admin-secondary">Previous</button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-admin-secondary">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
