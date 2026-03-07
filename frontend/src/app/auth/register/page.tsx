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
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Enter a valid phone number').regex(/^\+?[0-9]{10,15}$/, 'Invalid phone format'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and a number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = { fullName: data.fullName, phoneNumber: data.phoneNumber, password: data.password, ...(data.email ? { email: data.email } : {}) };
      const res = await authApi.register(payload);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Account created! Welcome to TEGA.Rw.');
      router.push('/search');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout showNav={false}>
      <AppHeader title="Create Account" showBack backHref="/" />

      <div className="px-5 pt-6 pb-10">
        <div className="mb-6">
          <p className="font-bold text-gray-900 text-xl">Join TEGA.Rw</p>
          <p className="text-gray-500 text-sm mt-1">Book buses across Rwanda with ease</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input {...register('fullName')} type="text" placeholder="John Doe" className="input-field" autoComplete="name" />
            {errors.fullName && <p className="error-text">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="label">Phone Number</label>
            <input {...register('phoneNumber')} type="tel" placeholder="+250788000000" className="input-field" autoComplete="tel" />
            {errors.phoneNumber && <p className="error-text">{errors.phoneNumber.message}</p>}
          </div>

          <div>
            <label className="label">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input {...register('email')} type="email" placeholder="john@example.com" className="input-field" autoComplete="email" />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <input {...register('password')} type="password" placeholder="Min 8 chars, upper, lower & number" className="input-field" autoComplete="new-password" />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input {...register('confirmPassword')} type="password" placeholder="Re-enter your password" className="input-field" autoComplete="new-password" />
            {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 mt-2"
          >
            {loading ? <><Spinner size="sm" /><span>Creating account...</span></> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 font-semibold">Sign in</Link>
        </p>
      </div>
    </MainLayout>
  );
}
