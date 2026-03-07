'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/components/layout/MainLayout';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, initFromStorage } = useAuthStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  return (
    <MainLayout showNav={false}>
      {/* Full-height splash */}
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-blue-500">
        {/* Logo area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6">
            <svg className="w-11 h-11 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>

          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">TEGA.Rw</h1>
          <p className="text-blue-100 text-base font-medium mb-1">Inter-Provincial Bus Tickets</p>
          <p className="text-blue-200 text-sm">Rwanda&apos;s easiest way to book bus seats online</p>
        </div>

        {/* Auth buttons */}
        <div className="px-6 pb-12 space-y-3">
          <Link
            href="/auth/login"
            className="block w-full bg-white text-blue-700 font-bold text-base py-4 rounded-2xl text-center active:scale-95 transition-transform shadow"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="block w-full bg-blue-800 bg-opacity-40 text-white font-semibold text-base py-4 rounded-2xl text-center border border-blue-400 active:scale-95 transition-transform"
          >
            Create Account
          </Link>
          <p className="text-center text-blue-300 text-xs pt-1">
            Book your seat &bull; Pay with MoMo &bull; Get digital ticket
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
