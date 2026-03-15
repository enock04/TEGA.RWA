'use client';

import { useEffect } from 'react';
import BottomNav from './BottomNav';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';

export default function MainLayout({ children, showNav = true }: { children: React.ReactNode; showNav?: boolean }) {
  const { isAuthenticated, user, clearAuth, initFromStorage } = useAuthStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      authApi.getProfile()
        .then(res => useAuthStore.getState().setUser(res.data.data.user))
        .catch(() => clearAuth());
    }
  }, [isAuthenticated, user, clearAuth]);

  return (
    <div className="app-shell">
      <div className={showNav ? 'page-content' : 'page-content-no-nav'}>
        {children}
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}
