'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import { usersApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initFromStorage, setUser, clearAuth } = useAuthStore();

  const [profileForm, setProfileForm] = useState({ fullName: '', email: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/auth/login');
  }, [isLoading, isAuthenticated, router]);

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
    if (pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed — please log in again');
      clearAuth();
      router.replace('/auth/login');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSavingPw(false); }
  };

  const handleLogout = () => { clearAuth(); router.replace('/auth/login'); };

  if (isLoading || !user) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950"><Spinner /></div>
  );

  return (
    <MainLayout>
      <AppHeader title="My Profile" />

      {/* Avatar + name */}
      <div className="flex flex-col items-center pt-6 pb-5 px-4">
        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-3 border-2 border-gray-600">
          {user.full_name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
        <p className="text-white text-lg font-bold">{user.full_name}</p>
        <p className="text-gray-500 text-sm">{user.phone_number}</p>
        <span className="mt-2 px-3 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 text-xs capitalize">{user.role}</span>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 bg-gray-900 rounded-xl p-1 border border-gray-800 mb-5">
        {(['profile', 'password'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize
              ${activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>
            {tab === 'profile' ? 'Edit Profile' : 'Change Password'}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4 pb-8">
        {activeTab === 'profile' ? (
          <>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Full Name</label>
              <input className="input-field" value={profileForm.fullName}
                onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Email (optional)</label>
              <input type="email" className="input-field" placeholder="your@email.com" value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Phone Number</label>
              <input className="input-field opacity-50 cursor-not-allowed" value={user.phone_number} disabled />
              <p className="text-gray-600 text-xs mt-1">Phone number cannot be changed</p>
            </div>
            <button onClick={handleSaveProfile} disabled={savingProfile}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {savingProfile ? <Spinner size="sm" /> : null} Save Changes
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Current Password</label>
              <input type="password" className="input-field" value={pwForm.currentPassword}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">New Password</label>
              <input type="password" className="input-field" value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
              <p className="text-gray-600 text-xs mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">Confirm New Password</label>
              <input type="password" className="input-field" value={pwForm.confirmPassword}
                onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            </div>
            <button onClick={handleChangePassword} disabled={savingPw}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {savingPw ? <Spinner size="sm" /> : null} Change Password
            </button>
          </>
        )}

        {/* Logout */}
        <div className="pt-4 border-t border-gray-800">
          <button onClick={handleLogout}
            className="w-full bg-gray-900 border border-gray-800 text-red-400 font-semibold py-3.5 rounded-2xl active:bg-gray-800 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
