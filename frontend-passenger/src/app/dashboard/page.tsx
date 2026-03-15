'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, isAfter } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Booking } from '@/types';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'cancelled'] as const;

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user, initFromStorage } = useAuthStore();

  const [stats, setStats] = useState<Stats>({ total: 0, confirmed: 0, pending: 0, cancelled: 0 });
  const [nextTrip, setNextTrip] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [tab, setTab] = useState<typeof STATUS_TABS[number]>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    fetchStats();
    fetchNextTrip();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, tab, page]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const [allRes, confirmedRes, pendingRes, cancelledRes] = await Promise.all([
        bookingsApi.getMyBookings({ page: 1, limit: 1 }),
        bookingsApi.getMyBookings({ page: 1, limit: 1, status: 'confirmed' }),
        bookingsApi.getMyBookings({ page: 1, limit: 1, status: 'pending' }),
        bookingsApi.getMyBookings({ page: 1, limit: 1, status: 'cancelled' }),
      ]);
      setStats({
        total:     allRes.data.data.total ?? 0,
        confirmed: confirmedRes.data.data.total ?? 0,
        pending:   pendingRes.data.data.total ?? 0,
        cancelled: cancelledRes.data.data.total ?? 0,
      });
    } catch {
      // silently fail — stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchNextTrip = async () => {
    try {
      const res = await bookingsApi.getMyBookings({ page: 1, limit: 5, status: 'confirmed' });
      const upcoming = (res.data.data.bookings as Booking[]).find(
        b => b.departure_time && isAfter(new Date(b.departure_time), new Date())
      );
      setNextTrip(upcoming ?? null);
    } catch {
      setNextTrip(null);
    }
  };

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
  const firstName = user?.full_name?.split(' ')[0] ?? '';

  return (
    <MainLayout>
      <AppHeader title={t('dashboard.title')} />

      {/* Greeting + date */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
          <h2 className="text-white font-bold text-lg">{firstName}</h2>
        </div>
        <Link href="/search"
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl active:bg-blue-700">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('dashboard.bookATrip')}
        </Link>
      </div>

      {/* Stats cards */}
      <div className="px-4 mb-4">
        {statsLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-3 animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: t('dashboard.totalTrips'), value: stats.total,     color: 'text-white',       bg: 'bg-gray-800 border-gray-700' },
              { label: t('dashboard.confirmed'),  value: stats.confirmed, color: 'text-green-400',   bg: 'bg-gray-800 border-gray-700' },
              { label: t('dashboard.pending'),    value: stats.pending,   color: 'text-yellow-400',  bg: 'bg-gray-800 border-gray-700' },
              { label: t('dashboard.cancelled'),  value: stats.cancelled, color: 'text-red-400',     bg: 'bg-gray-800 border-gray-700' },
            ].map(card => (
              <div key={card.label} className={`rounded-xl border p-2.5 ${card.bg}`}>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-gray-500 text-[10px] leading-tight mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next trip banner */}
      {nextTrip && (
        <div className="mx-4 mb-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">{t('dashboard.nextTrip')}</p>
          <p className="text-white font-bold text-base">{nextTrip.route_name}</p>
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-blue-100 text-xs">{nextTrip.departure_station} → {nextTrip.arrival_station}</p>
              <p className="text-blue-200 text-xs mt-0.5">
                {nextTrip.departure_time ? format(new Date(nextTrip.departure_time), 'EEE, dd MMM · HH:mm') : ''}
              </p>
            </div>
            <Link href={`/ticket/${nextTrip.id}`}
              className="bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg">
              {t('dashboard.ticket')}
            </Link>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="px-4 mb-3">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">{t('dashboard.recentTrips')}</p>
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { setTab(s); setPage(1); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === s ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              {t(`dashboard.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Booking list */}
      <div className="px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
            <Spinner /><span>{t('dashboard.loadingStats')}</span>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            title={t('dashboard.noBookings')}
            description={tab === 'all' ? t('dashboard.noBookingsDesc') : t('dashboard.noStatusBookings', { status: tab })}
            action={<Link href="/search" className="btn-primary text-sm">{t('dashboard.searchBuses')}</Link>}
          />
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-white text-sm flex-1 pr-2">{b.route_name}</p>
                  <Badge label={b.status.toUpperCase()} status={b.status} />
                </div>
                <p className="text-xs text-gray-500 mb-0.5">{b.departure_station} → {b.arrival_station}</p>
                <p className="text-xs text-gray-400 mb-0.5">
                  {b.departure_time ? format(new Date(b.departure_time), 'EEE, dd MMM yyyy · HH:mm') : '—'}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {b.bus_name} &bull; {t('dashboard.seat', { number: b.seat_number })}
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-amber-400 text-sm">RWF {Number(b.amount).toLocaleString()}</p>
                  <div className="flex gap-2">
                    {b.status === 'pending' && (
                      <Link href={`/payment/${b.id}`} className="btn-primary text-xs py-1.5 px-3">{t('dashboard.payNow')}</Link>
                    )}
                    {b.status === 'confirmed' && (
                      <Link href={`/ticket/${b.id}`} className="btn-primary text-xs py-1.5 px-3">{t('dashboard.ticket')}</Link>
                    )}
                    <Link href={`/booking/summary/${b.id}`} className="btn-secondary text-xs py-1.5 px-3">{t('dashboard.details')}</Link>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-secondary text-sm py-2 px-4 disabled:opacity-40">
                  {t('common.previous')}
                </button>
                <span className="text-xs text-gray-500">{t('dashboard.page', { current: page, total: totalPages })}</span>
                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn-secondary text-sm py-2 px-4 disabled:opacity-40">
                  {t('common.next')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
