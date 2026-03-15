'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { useAuthStore } from '@/store/authStore';

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user, initFromStorage, clearAuth } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const mobileNavItems = [
    { href: '/admin/bookings',  label: t('admin.viewBookings'), exact: false },
    { href: '/admin/routes',    label: t('admin.routes') },
    { href: '/admin/buses',     label: t('admin.buses') },
    { href: '/admin/schedules', label: t('admin.schedules') },
    { href: '/admin/stations',  label: t('admin.stations') },
    { href: '/admin/agencies',  label: t('admin.agencies') },
    { href: '/admin/users',     label: t('admin.users') },
    { href: '/admin/reports',   label: t('admin.reports') },
  ];

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="h-12 bg-white border-b border-gray-200 sticky top-0 z-50 flex items-center justify-end px-4 lg:px-6">
        <div className="relative">
          <button type="button" onClick={() => setProfileOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.full_name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name?.split(' ')[0] ?? 'Admin'}</span>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium text-gray-800 truncate">{user?.full_name ?? '—'}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role ?? 'admin'}</p>
              </div>
              <Link href="/admin/settings" onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Settings
              </Link>
              <button type="button" onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-12 z-40">
        <button type="button" onClick={() => setDrawerOpen(true)} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Open menu">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700">{t('admin.adminPanel')}</span>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-64 bg-gray-900 h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <span className="text-white font-bold">TEGA.Rw Admin</span>
              <button type="button" title="Close menu" onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              {mobileNavItems.map(item => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)}
                    className={clsx('flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors',
                      active ? 'bg-blue-700 text-white font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
