'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { adminApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface RouteRow {
  route_name: string;
  bookings: string | number;
  revenue: string | number;
}

interface DailyRow {
  date: string;
  bookings: string | number;
  revenue: string | number;
}

interface ReportsData {
  summary: {
    total_bookings: string | number;
    confirmed: string | number;
    cancelled: string | number;
    total_revenue: string | number;
  };
  byRoute: RouteRow[];
  daily: DailyRow[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '' });

  const handleExportCSV = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>;
      const qs = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await fetch(`${API_URL}/admin/reports/export${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReports(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      setData(res.data.data);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadReports(); }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Date range */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label-admin">From</label>
          <input type="date" title="From date" placeholder="YYYY-MM-DD" className="input-admin w-44" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label className="label-admin">To</label>
          <input type="date" title="To date" placeholder="YYYY-MM-DD" className="input-admin w-44" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <button type="button" onClick={loadReports} className="btn-admin-primary">Apply</button>
        <button type="button" onClick={handleExportCSV} className="btn-admin-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: `RWF ${Number(data.summary?.total_revenue || 0).toLocaleString()}` },
              { label: 'Total Bookings', value: data.summary?.total_bookings },
              { label: 'Confirmed', value: data.summary?.confirmed },
              { label: 'Cancelled', value: data.summary?.cancelled },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Revenue by route */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
            <h2 className="font-semibold text-gray-800 mb-4">Revenue by Route</h2>
            {data.byRoute?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      {['Route', 'Bookings', 'Revenue'].map(h => (
                        <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.byRoute.map((r, i) => (
                      <tr key={i}>
                        <td className="py-3 font-medium text-gray-900">{r.route_name}</td>
                        <td className="py-3 text-gray-600">{r.bookings}</td>
                        <td className="py-3 font-semibold text-blue-700">RWF {Number(r.revenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-400">No data for this period</p>}
          </div>

          {/* Daily bookings */}
          {data.daily?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
              <h2 className="font-semibold text-gray-800 mb-4">Daily Bookings</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      {['Date', 'Bookings', 'Revenue'].map(h => (
                        <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.daily.map((d, i) => (
                      <tr key={i}>
                        <td className="py-2.5 text-gray-700">{new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-2.5 text-gray-600">{d.bookings}</td>
                        <td className="py-2.5 font-semibold text-gray-800">RWF {Number(d.revenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
