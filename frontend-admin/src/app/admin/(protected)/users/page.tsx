'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { usersApi } from '@/lib/api';
import { User } from '@/types';

const EMPTY_FORM = { fullName: '', phoneNumber: '', email: '', password: '', role: 'agency' };
const EMPTY_EDIT = { fullName: '', email: '', role: '' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Create agent form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Edit user
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editSaving, setEditSaving] = useState(false);

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

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setEditForm({ fullName: u.full_name, email: u.email ?? '', role: u.role });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(EMPTY_EDIT); };

  const handleEdit = async (id: string) => {
    setEditSaving(true);
    try {
      const res = await usersApi.updateUser(id, {
        fullName: editForm.fullName || undefined,
        email: editForm.email || undefined,
        role: editForm.role || undefined,
      });
      setUsers(u => u.map(x => x.id === id ? { ...x, ...res.data.data.user } : x));
      cancelEdit();
      toast.success('User updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally { setEditSaving(false); }
  };

  const handleCreateAgent = async () => {
    if (!form.fullName || !form.phoneNumber || !form.password) {
      toast.error('Full name, phone number and password are required'); return;
    }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const res = await usersApi.createAgent({
        fullName: form.fullName, phoneNumber: form.phoneNumber,
        password: form.password, email: form.email || undefined,
        role: form.role,
      });
      setUsers(u => [res.data.data.user, ...u]);
      setTotal(t => t + 1);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success(`${form.role === 'admin' ? 'Admin' : 'Agency'} account created successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create agent');
    } finally { setSaving(false); }
  };

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number?.includes(search) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{total} total</span>
          <button type="button" onClick={() => setShowForm(v => !v)} className="btn-admin-primary">
            {showForm ? 'Cancel' : '+ Add Agent'}
          </button>
        </div>
      </div>

      {/* Add Agent Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">New Staff Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-admin">Role *</label>
              <select className="input-admin" title="Role" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="agency">Agency</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label-admin">Full Name *</label>
              <input className="input-admin" placeholder="e.g. John Doe" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Phone Number *</label>
              <input className="input-admin" placeholder="+250788000000" value={form.phoneNumber}
                onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Email (optional)</label>
              <input className="input-admin" type="email" placeholder="agent@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Password *</label>
              <input className="input-admin" type="password" placeholder="Min. 8 chars, upper+lower+number" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={handleCreateAgent} disabled={saving} className="btn-admin-primary flex items-center gap-2">
              {saving && <Spinner size="sm" />} Create {form.role === 'admin' ? 'Admin' : 'Agency'} Account
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="btn-admin-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input className="input-admin max-w-xs" placeholder="Search by name, phone or email…"
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
                    editingId === u.id ? (
                      /* ── Inline edit row ── */
                      <tr key={u.id} className="bg-blue-50">
                        <td className="px-4 py-2">
                          <input className="input-admin py-1 text-sm" title="Full Name" placeholder="Full Name" value={editForm.fullName}
                            onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-500 text-xs">{u.phone_number}</td>
                        <td className="px-4 py-2">
                          <input className="input-admin py-1 text-sm" type="email" placeholder="Email" title="Email"
                            value={editForm.email}
                            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                        </td>
                        <td className="px-4 py-2">
                          <select className="input-admin py-1 text-sm" title="Role" value={editForm.role}
                            onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                            <option value="passenger">Passenger</option>
                            <option value="agency">Agency</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td colSpan={2} />
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => handleEdit(u.id)} disabled={editSaving}
                              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg flex items-center gap-1">
                              {editSaving && <Spinner size="sm" />} Save
                            </button>
                            <button type="button" onClick={cancelEdit}
                              className="text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      /* ── Normal row ── */
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{u.full_name}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{u.phone_number}</td>
                        <td className="px-4 py-3 text-gray-500">{u.email ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                            ${u.role === 'admin'   ? 'bg-purple-100 text-purple-700' :
                              u.role === 'agency'  ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3"><Badge label={u.is_active ? 'active' : 'inactive'} status={u.is_active ? 'confirmed' : 'cancelled'} /></td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-3">
                            <button type="button" onClick={() => openEdit(u)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                            {u.role !== 'admin' && (
                              <button type="button" onClick={() => handleToggle(u.id, u.is_active)}
                                className={`text-xs font-medium ${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 1}
                  className="btn-admin-secondary">Prev</button>
                <button type="button" onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page * LIMIT >= total}
                  className="btn-admin-secondary">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
