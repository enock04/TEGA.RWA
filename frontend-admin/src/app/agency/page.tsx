'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/ui/Spinner';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface RecentBooking {
  id: string;
  status: string;
  amount: number | string;
  passenger_name: string;
  route_name: string;
  departure_time?: string;
}

interface TopRoute {
  route_name: string;
  total_bookings: number | string;
  revenue: number | string;
}

interface DashboardStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalPassengers: number;
  totalBuses: number;
  totalRoutes: number;
  recentBookings: RecentBooking[];
  topRoutes: TopRoute[];
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending:   'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    expired:   'bg-gray-100 text-gray-500',
  };
  return map[status] ?? 'bg-gray-100 text-gray-500';
}

function KpiCard({ label, value, color = 'green' }: { label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    green:  'bg-green-50  text-green-700  border-green-100',
    blue:   'bg-blue-50   text-blue-700   border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] ?? colors.green}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function AgencyDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then(res => {
        const d = res.data.data;
        setStats({
          totalBookings:     d.stats?.totalBookings ?? 0,
          confirmedBookings: d.stats?.confirmed     ?? 0,
          pendingBookings:   d.stats?.pending       ?? 0,
          cancelledBookings: d.stats?.cancelled     ?? 0,
          totalRevenue:      d.stats?.totalRevenue  ?? 0,
          totalPassengers:   d.stats?.passengers    ?? 0,
          totalBuses:        d.stats?.totalBuses    ?? 0,
          totalRoutes:       d.stats?.totalRoutes   ?? 0,
          recentBookings:    d.recentBookings        ?? [],
          topRoutes:         d.topRoutes             ?? [],
        });
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
      <Spinner /><span>{t('admin.loadingDashboard')}</span>
    </div>
  );

  if (!stats) return null;

  const agencyName = user?.full_name ?? 'Agency';
  const confirmRate = stats.totalBookings > 0
    ? Math.round((stats.confirmedBookings / stats.totalBookings) * 100) : 0;
  const pendingRate = stats.totalBookings > 0
    ? Math.round((stats.pendingBookings / stats.totalBookings) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{t('admin.welcome')}</p>
          <h1 className="text-xl font-bold text-gray-900">{agencyName}</h1>
        </div>
        <span className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1.5 rounded-full">Agency</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-5 text-white">
          <p className="text-green-200 text-xs font-semibold uppercase tracking-wide">{t('admin.totalRevenue')}</p>
          <p className="text-3xl font-bold mt-1">RWF {Number(stats.totalRevenue).toLocaleString()}</p>
          <p className="text-green-300 text-xs mt-1">{t('admin.confirmedOnly')}</p>
          <div className="mt-3 pt-3 border-t border-green-500 flex gap-4">
            <div>
              <p className="text-white font-bold">{stats.totalBookings}</p>
              <p className="text-green-300 text-xs">{t('admin.totalBookings')}</p>
            </div>
            <div>
              <p className="text-white font-bold">{stats.totalPassengers}</p>
              <p className="text-green-300 text-xs">{t('admin.passengers')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('admin.confirmationRate')}</p>
          <div className="space-y-4">
            {[
              { label: t('admin.confirmed'), pct: confirmRate, count: stats.confirmedBookings, dot: 'bg-green-500',  text: 'text-green-700' },
              { label: t('admin.pending'),   pct: pendingRate, count: stats.pendingBookings,   dot: 'bg-yellow-400', text: 'text-yellow-700' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{item.count} {t('admin.bookings')}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 ${item.text}`}>{item.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label={t('admin.confirmed')}   value={stats.confirmedBookings} color="green" />
        <KpiCard label={t('admin.pending')}     value={stats.pendingBookings}   color="yellow" />
        <KpiCard label={t('admin.activeBuses')} value={stats.totalBuses}        color="blue" />
        <KpiCard label={t('admin.routes')}      value={stats.totalRoutes}       color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">{t('admin.recentBookings')}</h2>
            <Link href="/agency/bookings" className="text-xs text-green-600 hover:underline">{t('dashboard.viewAll')}</Link>
          </div>
          {stats.recentBookings.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stats.recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate text-xs">{b.passenger_name}</p>
                    <p className="text-gray-400 text-xs truncate">{b.route_name}</p>
                    {b.departure_time && (
                      <p className="text-gray-300 text-xs">{format(new Date(b.departure_time), 'dd MMM · HH:mm')}</p>
                    )}
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="font-bold text-gray-800 text-xs">RWF {Number(b.amount).toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(b.status)}`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">{t('admin.noRecentBookings')}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">{t('admin.yourTopRoutes')}</h2>
            <Link href="/agency/schedules" className="text-xs text-green-600 hover:underline">{t('dashboard.viewAll')}</Link>
          </div>
          {stats.topRoutes.length > 0 ? (
            <div className="space-y-3">
              {stats.topRoutes.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-xs">{r.route_name}</p>
                    <p className="text-gray-400 text-xs">{r.total_bookings} {t('admin.bookings')}</p>
                  </div>
                  <p className="font-bold text-green-600 text-xs whitespace-nowrap">RWF {Number(r.revenue).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">{t('admin.noRouteData')}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3">{t('admin.quickActions')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/agency/buses',     label: t('admin.manageBuses'), icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',                        color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { href: '/agency/schedules', label: t('admin.schedules'),   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-green-50 text-green-700 border-green-200' },
            { href: '/agency/bookings',  label: t('admin.viewBookings'),icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'bg-purple-50 text-purple-700 border-purple-200' },
            { href: '/agency/reports',   label: t('admin.reports'),     icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
          ].map(item => (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center hover:opacity-80 transition-opacity ${item.color}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
