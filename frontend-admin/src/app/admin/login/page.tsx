'use client';

import { useState, useEffect, Suspense } from 'react';
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
  const { setAuth, isAuthenticated, user, initFromStorage } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole>('agency');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Hydrate auth state from localStorage so already-logged-in users are redirected
  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const next = params.get('next');
    // Only follow `next` if it matches the user's role section, otherwise use default
    if (next && user.role === 'admin' && next.startsWith('/admin') && next !== '/admin/login') { window.location.href = next; return; }
    if (next && user.role === 'agency' && next.startsWith('/agency')) { window.location.href = next; return; }
    if (user.role === 'admin') window.location.href = '/admin';
    else if (user.role === 'agency') window.location.href = '/agency';
    else window.location.href = '/';
  }, [isAuthenticated, user, router, params]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setRoleError(null);
    try {
      const res = await authApi.login(data);
      const { user: loggedInUser, accessToken, refreshToken } = res.data.data;

      // Validate that the credentials match the selected role
      if (loggedInUser.role !== selectedRole) {
        const otherRole = selectedRole === 'admin' ? 'Agency' : 'Admin';
        setRoleError(
          selectedRole === 'admin'
            ? `These credentials belong to an Agency account. Switch to the "${otherRole}" tab or use Admin credentials.`
            : `These credentials belong to an Admin account. Switch to the "${otherRole}" tab or use Agency credentials.`
        );
        setValue('password', '');
        return;
      }

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
                onClick={() => { setSelectedRole(role.id); setRoleError(null); }}
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
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                title={t('auth.password')}
                className="input-field pr-11"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          {roleError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{roleError}</p>
            </div>
          )}

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
          <a href="https://tega-rwa.vercel.app/auth/login" className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2">
            ← Customer login
          </a>
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
