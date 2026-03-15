'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';

export default function Navbar() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, clearAuth, initFromStorage } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      authApi.getProfile()
        .then(res => useAuthStore.getState().setUser(res.data.data.user))
        .catch(() => clearAuth());
    }
  }, [isAuthenticated, user, clearAuth]);

  const handleLogout = () => { clearAuth(); router.push('/auth/login'); };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — top left */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">TEGA.Rw</span>
          </Link>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.full_name?.split(' ')[0]}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500">{t('nav.signedInAs')}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{user?.phone_number}</p>
                    </div>
                    <Link href={user?.role === 'admin' || user?.role === 'agency' ? '/admin/settings' : '/profile'} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Settings</Link>
                    <button type="button" onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="btn-secondary text-sm py-2">{t('nav.signIn')}</Link>
                <Link href="/auth/register" className="btn-primary text-sm py-2">{t('nav.register')}</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              title={menuOpen ? 'Close menu' : 'Open menu'}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="p-2 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3">
            <div className="flex gap-2 px-4">
              {isAuthenticated ? (
                <button type="button" onClick={handleLogout} className="btn-danger text-sm py-2 w-full">
                  {t('nav.signOut')}
                </button>
              ) : (
                <>
                  <Link href="/auth/login" className="btn-secondary text-sm py-2 flex-1 text-center">{t('nav.signIn')}</Link>
                  <Link href="/auth/register" className="btn-primary text-sm py-2 flex-1 text-center">{t('nav.register')}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
