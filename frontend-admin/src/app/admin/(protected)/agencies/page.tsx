'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { adminApi } from '@/lib/api';

interface Agency {
  id: string;
  name: string;
  registration_no: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  total_buses: number;
  created_at: string;
}

const EMPTY_FORM = {
  name: '',
  registrationNo: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  logoUrl: '',
};

export default function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  const LIMIT = 20;

  const load = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminApi.getAgencies({ page: p, limit: LIMIT, search: q || undefined });
      setAgencies(res.data.data.agencies ?? []);
      setTotal(res.data.data.total ?? 0);
    } catch {
      toast.error('Failed to load agencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    load(1, e.target.value);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Agency name is required'); return; }
    setSaving(true);
    try {
      const res = await adminApi.createAgency({
        name: form.name,
        registrationNo: form.registrationNo || undefined,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        address: form.address || undefined,
        logoUrl: form.logoUrl || undefined,
      });
      setAgencies(a => [res.data.data.agency, ...a]);
      setTotal(t => t + 1);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Agency created');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create agency');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (a: Agency) => {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      registrationNo: a.registration_no ?? '',
      contactPhone: a.contact_phone ?? '',
      contactEmail: a.contact_email ?? '',
      address: a.address ?? '',
      logoUrl: a.logo_url ?? '',
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(EMPTY_FORM); };

  const handleEdit = async (id: string) => {
    if (!editForm.name.trim()) { toast.error('Agency name is required'); return; }
    setEditSaving(true);
    try {
      const res = await adminApi.updateAgency(id, {
        name: editForm.name,
        registrationNo: editForm.registrationNo || undefined,
        contactPhone: editForm.contactPhone || undefined,
        contactEmail: editForm.contactEmail || undefined,
        address: editForm.address || undefined,
        logoUrl: editForm.logoUrl || undefined,
      });
      setAgencies(list => list.map(x => x.id === id ? { ...x, ...res.data.data.agency } : x));
      cancelEdit();
      toast.success('Agency updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update agency');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await adminApi.toggleAgencyStatus(id, !current);
      setAgencies(list => list.map(x => x.id === id ? { ...x, is_active: !current } : x));
      toast.success(`Agency ${!current ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update agency status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Agencies</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{total} total</span>
          <button type="button" onClick={() => setShowForm(v => !v)} className="btn-admin-primary">
            {showForm ? 'Cancel' : '+ New Agency'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-card">
          <h2 className="font-semibold text-gray-800 mb-4">New Agency</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-admin">Name *</label>
              <input className="input-admin" placeholder="e.g. Virunga Express" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Registration No.</label>
              <input className="input-admin" placeholder="RW-AGN-001" value={form.registrationNo}
                onChange={e => setForm(f => ({ ...f, registrationNo: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Contact Phone</label>
              <input className="input-admin" placeholder="+250788000000" value={form.contactPhone}
                onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
            </div>
            <div>
              <label className="label-admin">Contact Email</label>
              <input className="input-admin" type="email" placeholder="info@agency.rw" value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label-admin">Address</label>
              <input className="input-admin" placeholder="KG 123 St, Kigali" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={handleCreate} disabled={saving} className="btn-admin-primary flex items-center gap-2">
              {saving && <Spinner size="sm" />} Create Agency
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="btn-admin-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input className="input-admin max-w-xs" placeholder="Search by name, reg. no. or email…"
          value={search} onChange={handleSearch} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400"><Spinner /><span>Loading...</span></div>
      ) : agencies.length === 0 ? (
        <EmptyState title="No agencies found" />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Name', 'Reg. No.', 'Phone', 'Email', 'Buses', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {agencies.map(a => (
                    editingId === a.id ? (
                      /* ── Inline edit ── */
                      <tr key={a.id} className="bg-blue-50">
                        <td className="px-4 py-2">
                          <input className="input-admin py-1 text-sm" placeholder="Name" value={editForm.name}
                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        </td>
                        <td className="px-4 py-2">
                          <input className="input-admin py-1 text-sm" placeholder="Reg. No." value={editForm.registrationNo}
                            onChange={e => setEditForm(f => ({ ...f, registrationNo: e.target.value }))} />
                        </td>
                        <td className="px-4 py-2">
                          <input className="input-admin py-1 text-sm" placeholder="Phone" value={editForm.contactPhone}
                            onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))} />
                        </td>
                        <td className="px-4 py-2">
                          <input className="input-admin py-1 text-sm" type="email" placeholder="Email" value={editForm.contactEmail}
                            onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))} />
                        </td>
                        <td className="px-4 py-2 text-gray-500">{a.total_buses}</td>
                        <td />
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => handleEdit(a.id)} disabled={editSaving}
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
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{a.name}</td>
                        <td className="px-4 py-3 text-gray-500">{a.registration_no ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{a.contact_phone ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{a.contact_email ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{a.total_buses}</td>
                        <td className="px-4 py-3">
                          <Badge label={a.is_active ? 'active' : 'inactive'} status={a.is_active ? 'confirmed' : 'cancelled'} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-3">
                            <button type="button" onClick={() => openEdit(a)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                            <button type="button" onClick={() => handleToggle(a.id, a.is_active)}
                              className={`text-xs font-medium ${a.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                              {a.is_active ? 'Deactivate' : 'Activate'}
                            </button>
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
                <button type="button" disabled={page === 1}
                  onClick={() => { const p = page - 1; setPage(p); load(p); }}
                  className="btn-admin-secondary">Prev</button>
                <button type="button" disabled={page * LIMIT >= total}
                  onClick={() => { const p = page + 1; setPage(p); load(p); }}
                  className="btn-admin-secondary">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
