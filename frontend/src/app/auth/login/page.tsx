'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
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

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
      if (user.role === 'admin' || user.role === 'agency') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout showNav={false}>
      <AppHeader title="Sign In" showBack backHref="/" />

      <div className="px-5 pt-6 pb-10">
        {/* Logo area */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">Welcome back</p>
            <p className="text-gray-400 text-sm">Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Phone Number</label>
            <input
              {...register('phoneNumber')}
              type="tel"
              placeholder="+250788000000"
              className="input-field"
              autoComplete="tel"
            />
            {errors.phoneNumber && <p className="error-text">{errors.phoneNumber.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="Enter your password"
              className="input-field"
              autoComplete="current-password"
            />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
            <div className="text-right mt-1">
              <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-white underline underline-offset-2">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 mt-2"
          >
            {loading ? <><Spinner size="sm" /><span>Signing in...</span></> : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-white font-semibold underline underline-offset-2">
              Create one
            </Link>
          </p>
          <p className="text-xs text-gray-400">
            By signing in you agree to our Terms &amp; Privacy Policy.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
