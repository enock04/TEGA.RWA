'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { adminApi } from '@/lib/api';

interface DashboardStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalPassengers: number;
  totalBuses: number;
  totalRoutes: number;
  recentBookings: any[];
  topRoutes: any[];
}

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then(res => {
        const d = res.data.data;
        setStats({
          totalBookings: d.stats?.totalBookings ?? 0,
          confirmedBookings: d.stats?.confirmed ?? 0,
          pendingBookings: d.stats?.pending ?? 0,
          cancelledBookings: d.stats?.cancelled ?? 0,
          totalRevenue: d.stats?.totalRevenue ?? 0,
          totalPassengers: d.stats?.passengers ?? 0,
          totalBuses: d.stats?.totalBuses ?? 0,
          totalRoutes: d.stats?.totalRoutes ?? 0,
          recentBookings: d.recentBookings ?? [],
          topRoutes: d.topRoutes ?? [],
        });
      })
      .catch(() => toast.error('Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
      <Spinner /><span>Loading dashboard...</span>
    </div>
  );

  if (!stats) return null;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Bookings" value={stats.totalBookings} color="blue" />
        <StatCard label="Revenue" value={`RWF ${Number(stats.totalRevenue || 0).toLocaleString()}`} color="green" />
        <StatCard label="Active Buses" value={stats.totalBuses} color="blue" />
        <StatCard label="Routes" value={stats.totalRoutes} color="blue" />
        <StatCard label="Confirmed" value={stats.confirmedBookings} color="green" />
        <StatCard label="Pending" value={stats.pendingBookings} color="yellow" />
        <StatCard label="Cancelled" value={stats.cancelledBookings} color="red" />
        <StatCard label="Passengers" value={stats.totalPassengers} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Bookings</h2>
          {stats.recentBookings?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{b.passenger_name}</p>
                    <p className="text-gray-500 text-xs">{b.route_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">RWF {Number(b.amount).toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No recent bookings</p>}
        </div>

        {/* Top routes */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">Top Routes</h2>
          {stats.topRoutes?.length > 0 ? (
            <div className="space-y-3">
              {stats.topRoutes.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{r.route_name}</p>
                    <p className="text-gray-500 text-xs">{r.total_bookings} bookings</p>
                  </div>
                  <p className="font-semibold text-blue-700">RWF {Number(r.revenue).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No route data yet</p>}
        </div>
      </div>
    </div>
  );
}
