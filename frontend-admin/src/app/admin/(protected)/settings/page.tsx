'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { usersApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Tab = 'profile' | 'password';

const TABS: { id: Tab; label: string; icon: string }[] = [
  {
    id: 'profile',
    label: 'Edit Profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    id: 'password',
    label: 'Security',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
];

function SvgIcon({ d, className = 'w-4 h-4' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, setUser, clearAuth } = useAuthStore();

  const [profileForm, setProfileForm] = useState({ fullName: '', email: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    if (user) setProfileForm({ fullName: user.full_name ?? '', email: user.email ?? '' });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!profileForm.fullName.trim()) { toast.error('Name is required'); return; }
    setSavingProfile(true);
    try {
      const res = await usersApi.updateProfile({ fullName: profileForm.fullName, email: profileForm.email || undefined });
      setUser(res.data.data.user);
      toast.success('Profile updated');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to update profile'); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('Fill in all password fields'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwForm.newPassword)) { toast.error('Password must contain uppercase, lowercase, and a number'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed — please log in again');
      clearAuth();
      router.replace('/admin/login');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSavingPw(false); }
  };

  const handleLogout = () => { clearAuth(); router.replace('/admin/login'); };

  if (!user) return <div className="flex items-center justify-center py-32"><Spinner /></div>;

  const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U';
  const roleColor = user.role === 'admin'
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  const avatarGradient = user.role === 'admin'
    ? 'from-purple-500 to-indigo-600'
    : 'from-emerald-500 to-teal-600';

  return (
    <div className="max-w-5xl space-y-6">

      {/* Page header row */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your profile and security preferences</p>
        </div>

        {/* Identity card — top right */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl px-5 py-4 flex items-center gap-4 text-white flex-shrink-0">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-lg`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate max-w-[160px]">{user.full_name}</p>
            <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[160px]">{user.phone_number}</p>
            {user.email && <p className="text-gray-500 text-xs truncate max-w-[160px]">{user.email}</p>}
          </div>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize flex-shrink-0 ${roleColor}`}>
            {user.role}
          </span>
        </div>
      </div>

      {/* Settings panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-2xl">

        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {TABS.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <SvgIcon d={tab.icon} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'profile' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-admin">Full Name</label>
                  <input className="input-admin" title="Full Name" placeholder="Full Name"
                    value={profileForm.fullName}
                    onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div>
                  <label className="label-admin">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input className="input-admin" type="email" title="Email" placeholder="your@email.com"
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label-admin">Phone Number</label>
                <div className="relative">
                  <input className="input-admin opacity-60 cursor-not-allowed pr-24" title="Phone Number"
                    value={user.phone_number} disabled />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    read-only
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <SvgIcon d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3.5 h-3.5" />
                  Phone number cannot be changed
                </p>
              </div>
              <div className="pt-1 flex items-center gap-3">
                <button type="button" onClick={handleSaveProfile} disabled={savingProfile}
                  className="btn-admin-primary flex items-center gap-2">
                  {savingProfile
                    ? <Spinner size="sm" />
                    : <SvgIcon d="M5 13l4 4L19 7" className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex gap-3 text-sm text-amber-700">
                <SvgIcon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>After changing your password you will be signed out and redirected to login.</span>
              </div>

              {([
                { key: 'currentPassword' as const, label: 'Current Password',     show: showPw.current, toggle: () => setShowPw(s => ({ ...s, current: !s.current })), hint: undefined as string | undefined },
                { key: 'newPassword'     as const, label: 'New Password',         show: showPw.next,    toggle: () => setShowPw(s => ({ ...s, next: !s.next })),    hint: 'Min. 8 characters' as string | undefined },
                { key: 'confirmPassword' as const, label: 'Confirm New Password', show: showPw.confirm, toggle: () => setShowPw(s => ({ ...s, confirm: !s.confirm })), hint: undefined as string | undefined },
              ]).map(field => (
                <div key={field.key}>
                  <label className="label-admin">{field.label}</label>
                  <div className="relative">
                    <input
                      className="input-admin pr-10"
                      type={field.show ? 'text' : 'password'}
                      title={field.label}
                      placeholder={field.hint ?? '••••••••'}
                      value={pwForm[field.key]}
                      onChange={e => setPwForm(f => ({ ...f, [field.key]: e.target.value }))} />
                    <button type="button" onClick={field.toggle} title={field.show ? 'Hide' : 'Show'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <SvgIcon
                        d={field.show
                          ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
                          : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'}
                        className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-1">
                <button type="button" onClick={handleChangePassword} disabled={savingPw}
                  className="btn-admin-primary flex items-center gap-2">
                  {savingPw
                    ? <Spinner size="sm" />
                    : <SvgIcon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" className="w-4 h-4" />}
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between max-w-2xl">
        <div>
          <p className="font-medium text-gray-800">Sign Out</p>
          <p className="text-sm text-gray-400 mt-0.5">You will be redirected to the staff login page.</p>
        </div>
        <button type="button" onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
          <SvgIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="w-4 h-4" />
          Sign Out
        </button>
      </div>

    </div>
  );
}
