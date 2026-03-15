'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const homeIcon = (active: boolean) => (
    <svg className={clsx('w-6 h-6', active ? 'text-white' : 'text-gray-500')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );

  const searchIcon = (active: boolean) => (
    <svg className={clsx('w-6 h-6', active ? 'text-white' : 'text-gray-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );

  const tripsIcon = (active: boolean) => (
    <svg className={clsx('w-6 h-6', active ? 'text-white' : 'text-gray-500')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );

  const profileIcon = (active: boolean) => (
    <svg className={clsx('w-6 h-6', active ? 'text-white' : 'text-gray-500')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const items = isAuthenticated
    ? [
        { href: '/',          label: t('nav.home'),       icon: homeIcon },
        { href: '/search',    label: t('common.search'),  icon: searchIcon },
        { href: '/dashboard', label: t('home.myTrips'),   icon: tripsIcon },
        { href: '/profile',   label: t('nav.myProfile'),  icon: profileIcon },
      ]
    : [
        { href: '/',           label: t('nav.home'),      icon: homeIcon },
        { href: '/search',     label: t('common.search'), icon: searchIcon },
        { href: '/auth/login', label: t('nav.signIn'),    icon: profileIcon },
      ];

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className="bottom-nav-item">
            {item.icon(active)}
            <span className={active ? 'text-white' : 'text-gray-500'}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
