'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/ui/Spinner';
import { adminApi } from '@/lib/api';

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
  expiredBookings: number;
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

/* ─── Metric Card ─────────────────────────────────────────────────────── */
function MetricCard({ label, value, sub, icon, color = 'blue' }: {
  label: string; value: string | number; sub?: string; icon: string; color?: string;
}) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    blue:   { bg: 'bg-blue-50   border-blue-100',  icon: 'text-blue-500',   text: 'text-blue-700'   },
    green:  { bg: 'bg-green-50  border-green-100', icon: 'text-green-500',  text: 'text-green-700'  },
    yellow: { bg: 'bg-yellow-50 border-yellow-100',icon: 'text-yellow-500', text: 'text-yellow-700' },
    red:    { bg: 'bg-red-50    border-red-100',   icon: 'text-red-500',    text: 'text-red-700'    },
    purple: { bg: 'bg-purple-50 border-purple-100',icon: 'text-purple-500', text: 'text-purple-700' },
    indigo: { bg: 'bg-indigo-50 border-indigo-100',icon: 'text-indigo-500', text: 'text-indigo-700' },
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div className={`rounded-xl border p-4 ${c.bg} flex items-start gap-3`}>
      <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <svg className={`w-[18px] h-[18px] ${c.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── ADMIN Dashboard ────────────────────────────────────────────────── */
function AdminDashboard({ stats }: { stats: DashboardStats }) {
  const { t } = useTranslation();
  const confirmRate = stats.totalBookings > 0
    ? Math.round((stats.confirmedBookings / stats.totalBookings) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('admin.systemOverview')}</p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-full">Admin</span>
      </div>

      {/* Revenue banner */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 text-white flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{t('admin.totalRevenue')}</p>
          <p className="text-3xl font-bold mt-1">RWF {Number(stats.totalRevenue).toLocaleString()}</p>
          <p className="text-gray-500 text-xs mt-1">{confirmRate}% {t('admin.confirmationRate').toLowerCase()}</p>
        </div>
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label={t('admin.totalBookings')} value={stats.totalBookings}   icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" color="blue" />
        <MetricCard label={t('admin.passengers')}    value={stats.totalPassengers} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" color="purple" />
        <MetricCard label={t('admin.activeBuses')}   value={stats.totalBuses}      icon="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" color="indigo" />
        <MetricCard label={t('admin.routes')}        value={stats.totalRoutes}     icon="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" color="blue" />
      </div>

      {/* Booking status breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Booking Status</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('admin.confirmed'), value: stats.confirmedBookings, pct: stats.totalBookings ? Math.round(stats.confirmedBookings/stats.totalBookings*100) : 0, color: 'text-green-600', bar: 'bg-green-500' },
            { label: t('admin.pending'),   value: stats.pendingBookings,   pct: stats.totalBookings ? Math.round(stats.pendingBookings/stats.totalBookings*100)   : 0, color: 'text-yellow-600', bar: 'bg-yellow-400' },
            { label: t('admin.cancelled'), value: stats.cancelledBookings, pct: stats.totalBookings ? Math.round(stats.cancelledBookings/stats.totalBookings*100) : 0, color: 'text-red-600',    bar: 'bg-red-400' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              <p className="text-xs text-gray-400">{item.pct}%</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent bookings */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">{t('admin.recentBookings')}</h2>
            <Link href="/admin/bookings" className="text-xs text-blue-600 hover:underline">{t('dashboard.viewAll')}</Link>
          </div>
          {stats.recentBookings.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stats.recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{b.passenger_name}</p>
                    <p className="text-gray-400 text-xs truncate">{b.route_name}</p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="font-semibold text-gray-800 text-xs">RWF {Number(b.amount).toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(b.status)}`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">{t('admin.noRecentBookings')}</p>}
        </div>

        {/* Top routes */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">{t('admin.topRoutes')}</h2>
            <Link href="/admin/routes" className="text-xs text-blue-600 hover:underline">{t('dashboard.viewAll')}</Link>
          </div>
          {stats.topRoutes.length > 0 ? (
            <div className="space-y-3">
              {stats.topRoutes.map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-xs">{r.route_name}</p>
                    <p className="text-gray-400 text-xs">{r.total_bookings} {t('admin.bookings')}</p>
                  </div>
                  <p className="font-bold text-blue-700 text-xs whitespace-nowrap">RWF {Number(r.revenue).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">{t('admin.noRouteData')}</p>}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/admin/users',     label: t('admin.users'),        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'bg-purple-50 text-purple-700 border-purple-200' },
          { href: '/admin/stations',  label: t('admin.stations'),     icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', color: 'bg-green-50 text-green-700 border-green-200' },
          { href: '/admin/buses',     label: t('admin.buses'),        icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { href: '/admin/reports',   label: t('admin.reports'),      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
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
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { t } = useTranslation();
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
          expiredBookings:   d.stats?.expired       ?? 0,
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

  return <AdminDashboard stats={stats} />;
}
