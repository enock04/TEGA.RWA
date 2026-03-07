'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { adminApi } from '@/lib/api';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReports(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      setData(res.data.data);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Date range */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input-field w-44" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input-field w-44" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <button onClick={fetch} className="btn-primary text-sm">Apply</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: `RWF ${Number(data.totalRevenue || 0).toLocaleString()}` },
              { label: 'Total Bookings', value: data.totalBookings },
              { label: 'Confirmed', value: data.confirmedBookings },
              { label: 'Cancelled', value: data.cancelledBookings },
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
            {data.revenueByRoute?.length > 0 ? (
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
                    {data.revenueByRoute.map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="py-3 font-medium text-gray-900">{r.route_name}</td>
                        <td className="py-3 text-gray-600">{r.booking_count}</td>
                        <td className="py-3 font-semibold text-blue-700">RWF {Number(r.revenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-400">No data for this period</p>}
          </div>

          {/* Daily bookings */}
          {data.dailyBookings?.length > 0 && (
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
                    {data.dailyBookings.map((d: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2.5 text-gray-700">{d.date}</td>
                        <td className="py-2.5 text-gray-600">{d.count}</td>
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
