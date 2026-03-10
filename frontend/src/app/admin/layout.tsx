'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import Navbar from '@/components/layout/Navbar';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { useAuthStore } from '@/store/authStore';

const mobileNavItems = [
  { href: '/admin',           label: 'Dashboard', exact: true },
  { href: '/admin/routes',    label: 'Routes' },
  { href: '/admin/buses',     label: 'Buses' },
  { href: '/admin/schedules', label: 'Schedules' },
  { href: '/admin/bookings',  label: 'Bookings' },
  { href: '/admin/stations',  label: 'Stations' },
  { href: '/admin/users',     label: 'Users' },
  { href: '/admin/reports',   label: 'Reports' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, initFromStorage } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (user && user.role === 'passenger') { router.push('/'); }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-16 z-40">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700">Admin Panel</span>
      </div>

      {/* Mobile drawer overlay */}
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
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={clsx(
                      'flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors',
                      active ? 'bg-blue-700 text-white font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
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
