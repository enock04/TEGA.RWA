'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { usersApi } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const LIMIT = 20;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await usersApi.getAll({ page: p, limit: LIMIT });
      setUsers(res.data.data.users ?? res.data.data ?? []);
      setTotal(res.data.data.total ?? 0);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await usersApi.toggleStatus(id, !current);
      setUsers(u => u.map(x => x.id === id ? { ...x, is_active: !current } : x));
      toast.success(`User ${!current ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update user status'); }
  };

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number?.includes(search) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="mb-4">
        <input className="input-field max-w-xs" placeholder="Search by name, phone or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Name', 'Phone', 'Email', 'Role', 'Status', 'Joined', ''].map(h =>
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  )}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{u.full_name}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{u.phone_number}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                          ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'agency' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3"><Badge label={u.is_active ? 'active' : 'inactive'} status={u.is_active ? 'confirmed' : 'cancelled'} /></td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {u.role !== 'admin' && (
                          <button onClick={() => handleToggle(u.id, u.is_active)}
                            className={`text-xs font-medium ${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
              <div className="flex gap-2">
                <button onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 1}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
                <button onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page * LIMIT >= total}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
