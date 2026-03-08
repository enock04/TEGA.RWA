'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Booking } from '@/types';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'cancelled'];

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, initFromStorage } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, tab, page]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getMyBookings({
        page,
        limit: LIMIT,
        ...(tab !== 'all' ? { status: tab } : {}),
      });
      setBookings(res.data.data.bookings);
      setTotal(res.data.data.total);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <MainLayout>
      <AppHeader
        title="My Trips"
        right={
          <Link href="/search" className="text-sm font-semibold text-white bg-gray-800 px-3 py-1 rounded-xl border border-gray-700">+ Book</Link>
        }
      />

      {/* User greeting */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-gray-400 text-sm">
          Welcome back, <span className="font-semibold text-white">{user?.full_name?.split(' ')[0]}</span>
        </p>
      </div>

      {/* Status tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {STATUS_TABS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setPage(1); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors capitalize ${
                tab === t ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
            <Spinner /><span>Loading bookings...</span>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No bookings found"
            description={tab === 'all' ? "You haven't made any bookings yet." : `No ${tab} bookings.`}
            action={<Link href="/search" className="btn-primary text-sm">Search Buses</Link>}
          />
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-white text-sm">{b.route_name}</p>
                  <Badge label={b.status.toUpperCase()} status={b.status} />
                </div>

                <p className="text-xs text-gray-500 mb-0.5">
                  {b.departure_station} → {b.arrival_station}
                </p>
                <p className="text-xs text-gray-400 mb-0.5">
                  {b.departure_time ? format(new Date(b.departure_time), 'EEE, dd MMM yyyy · HH:mm') : '—'}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {b.bus_name} &bull; Seat #{b.seat_number}
                </p>

                <div className="flex items-center justify-between">
                  <p className="font-bold text-amber-400 text-sm">RWF {Number(b.amount).toLocaleString()}</p>
                  <div className="flex gap-2">
                    {b.status === 'pending' && (
                      <Link href={`/payment/${b.id}`} className="btn-primary text-xs py-1.5 px-3">Pay Now</Link>
                    )}
                    {b.status === 'confirmed' && (
                      <Link href={`/ticket/${b.id}`} className="btn-primary text-xs py-1.5 px-3">Ticket</Link>
                    )}
                    <Link href={`/booking/summary/${b.id}`} className="btn-secondary text-xs py-1.5 px-3">Details</Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
