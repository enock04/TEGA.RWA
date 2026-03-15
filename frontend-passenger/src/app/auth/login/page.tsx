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
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';

const schema = z.object({
  phoneNumber: z.string().min(10, 'Enter a valid phone number'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const next = params.get('next');
    if (next) { router.replace(next); return; }
    // Passengers go home; staff are redirected to their portals
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

  return (
    <MainLayout showNav={false}>
      <AppHeader title={t('nav.signIn')} showBack backHref="/" />

      <div className="px-5 pt-6 pb-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">{t('auth.welcomeBack')}</p>
            <p className="text-gray-400 text-sm">{t('auth.signInToAccount')}</p>
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
            <div className="text-right mt-1">
              <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-white underline underline-offset-2">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 mt-2"
          >
            {loading
              ? <><Spinner size="sm" /><span>{t('auth.signingIn')}</span></>
              : t('nav.signIn')
            }
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-500">
            {t('auth.noAccount')}{' '}
            <Link href="/auth/register" className="text-white font-semibold underline underline-offset-2">
              {t('auth.createOne')}
            </Link>
          </p>
          <p className="text-xs text-gray-400">{t('auth.termsNotice')}</p>
        </div>
      </div>
    </MainLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<MainLayout showNav={false}><div className="flex items-center justify-center py-20"><Spinner /></div></MainLayout>}>
      <LoginForm />
    </Suspense>
  );
}
