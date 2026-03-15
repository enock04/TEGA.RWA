'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Spinner from '@/components/ui/Spinner';

const schema = z.object({
  phoneNumber: z.string().min(10, 'Enter a valid phone number'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;
type StaffRole = 'agency' | 'admin';

const STAFF_ROLES: { id: StaffRole; labelKey: string; descKey: string; icon: string; activeClass: string; accent: string }[] = [
  {
    id: 'agency',
    labelKey: 'auth.roleAgency',
    descKey: 'auth.roleAgencyDesc',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    accent: 'text-green-400',
    activeClass: 'border-green-500 bg-green-500/10 text-green-400',
  },
  {
    id: 'admin',
    labelKey: 'auth.roleAdmin',
    descKey: 'auth.roleAdminDesc',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    accent: 'text-purple-400',
    activeClass: 'border-purple-500 bg-purple-500/10 text-purple-400',
  },
];

function StaffLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole>('agency');

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const next = params.get('next');
    if (next) { router.replace(next); return; }
    if (user.role === 'admin') router.replace('/admin');
    else if (user.role === 'agency') router.replace('/agency');
    else router.replace('/');
  }, [isAuthenticated, user, router, params]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const { user: loggedInUser, accessToken, refreshToken } = res.data.data;
      setAuth(loggedInUser, accessToken, refreshToken);
      toast.success(`${t('auth.welcomeBack')}, ${loggedInUser.full_name.split(' ')[0]}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const active = STAFF_ROLES.find(r => r.id === selectedRole)!;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">Staff Portal</p>
            <p className="text-gray-400 text-sm">TEGA.Rw — Restricted Access</p>
          </div>
        </div>

        {/* Role selector */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">{t('auth.signingInAs')}</p>
          <div className="grid grid-cols-2 gap-2">
            {STAFF_ROLES.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  selectedRole === role.id
                    ? role.activeClass
                    : 'border-gray-700 bg-gray-800/50 text-gray-500 hover:border-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={role.icon} />
                </svg>
                <span className="text-xs font-semibold">{t(role.labelKey)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 flex items-center gap-2">
            <svg className={`w-3.5 h-3.5 flex-shrink-0 ${active.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-400">{t(active.descKey)}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">{t('auth.phoneNumber')}</label>
            <input
              {...register('phoneNumber')}
              type="tel"
              placeholder="+250788000000"
              title={t('auth.phoneNumber')}
              className="input-field"
              autoComplete="tel"
            />
            {errors.phoneNumber && <p className="error-text">{errors.phoneNumber.message}</p>}
          </div>

          <div>
            <label className="label">{t('auth.password')}</label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              title={t('auth.password')}
              className="input-field"
              autoComplete="current-password"
            />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 mt-2"
          >
            {loading
              ? <><Spinner size="sm" /><span>{t('auth.signingIn')}</span></>
              : `${t('nav.signIn')} as ${t(active.labelKey)}`
            }
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2">
            ← Customer login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><Spinner /></div>}>
      <StaffLoginForm />
    </Suspense>
  );
}
