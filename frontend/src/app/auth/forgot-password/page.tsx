'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';

type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) { toast.error('Enter your phone number'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(phoneNumber.trim());
      toast.success('If this number is registered, a reset code has been sent via SMS');
      setStep('reset');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) { toast.error('Enter the reset token'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token.trim(), newPassword);
      setStep('done');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout showNav={false}>
      <AppHeader title="Reset Password" showBack backHref="/auth/login" />

      <div className="px-5 pt-6 pb-10 max-w-sm mx-auto">
        {step === 'request' && (
          <>
            <div className="mb-8">
              <p className="font-bold text-white text-lg">Forgot your password?</p>
              <p className="text-gray-400 text-sm mt-1">Enter your phone number and we&apos;ll send a reset code.</p>
            </div>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+250788000000"
                  className="input-field"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4"
              >
                {loading ? <><Spinner size="sm" /><span>Sending...</span></> : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="mb-8">
              <p className="font-bold text-white text-lg">Enter Reset Code</p>
              <p className="text-gray-400 text-sm mt-1">Check your SMS for the reset code and set a new password.</p>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="label">Reset Code</label>
                <input
                  type="text"
                  placeholder="Paste reset code here"
                  className="input-field"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  placeholder="Min. 8 chars, upper, lower, number"
                  className="input-field"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  className="input-field"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4"
              >
                {loading ? <><Spinner size="sm" /><span>Resetting...</span></> : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setStep('request')} className="w-full text-sm text-gray-400 underline text-center">
                Back
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-white text-lg">Password Reset!</p>
            <p className="text-gray-400 text-sm">You can now sign in with your new password.</p>
            <button onClick={() => router.push('/auth/login')} className="btn-primary w-full py-4">
              Go to Sign In
            </button>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Remembered it?{' '}
            <Link href="/auth/login" className="text-white font-semibold underline underline-offset-2">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </MainLayout>
  );
}
