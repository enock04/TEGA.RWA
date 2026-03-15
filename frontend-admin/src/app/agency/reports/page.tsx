'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { adminApi } from '@/lib/api';

interface RouteRow { route_name: string; bookings: string | number; revenue: string | number; }
interface DailyRow  { date: string;       bookings: string | number; revenue: string | number; }
interface ReportsData {
  summary: { total_bookings: string | number; confirmed: string | number; cancelled: string | number; total_revenue: string | number; };
  byRoute: RouteRow[];
  daily:   DailyRow[];
}

export default function AgencyReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '' });

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReports(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      setData(res.data.data);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReports(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const summaryCards = data ? [
    { label: 'Total Revenue',   value: `RWF ${Number(data.summary?.total_revenue || 0).toLocaleString()}`, green: true },
    { label: 'Total Bookings',  value: data.summary?.total_bookings ?? 0 },
    { label: 'Confirmed',       value: data.summary?.confirmed ?? 0 },
    { label: 'Cancelled',       value: data.summary?.cancelled ?? 0 },
  ] : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your revenue and booking performance</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label-admin">From</label>
          <input type="date" title="From date" className="input-admin w-44" value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label className="label-admin">To</label>
          <input type="date" title="To date" className="input-admin w-44" value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <button type="button" onClick={loadReports} className="btn-admin-primary">Apply</button>
        {(filters.from || filters.to) && (
          <button type="button" onClick={() => { setFilters({ from: '', to: '' }); }} className="btn-admin-secondary">Clear</button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${'green' in s && s.green ? 'text-green-700' : 'text-gray-900'}`}>{String(s.value)}</p>
              </div>
            ))}
          </div>

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
                        <td className="py-3 font-semibold text-green-700">RWF {Number(r.revenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-400">No data for this period</p>}
          </div>

          {data.daily?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
              <h2 className="font-semibold text-gray-800 mb-4">Daily Breakdown</h2>
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
