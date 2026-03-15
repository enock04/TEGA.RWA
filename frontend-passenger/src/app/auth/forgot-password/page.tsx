'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';

type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('request');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) { toast.error(t('auth.phoneNumber')); return; }
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
    if (!token.trim()) { toast.error(t('auth.resetCode')); return; }
    if (newPassword.length < 8) { toast.error(t('auth.passwordMin')); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) { toast.error(t('auth.newPasswordPlaceholder')); return; }
    if (newPassword !== confirm) { toast.error(t('auth.passwordsDontMatch')); return; }
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
      <AppHeader title={t('auth.forgotPasswordTitle')} showBack backHref="/auth/login" />

      <div className="px-5 pt-6 pb-10 max-w-sm mx-auto">
        {step === 'request' && (
          <>
            <div className="mb-8">
              <p className="font-bold text-white text-lg">{t('auth.forgotPasswordTitle')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('auth.forgotPasswordDesc')}</p>
            </div>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="label">{t('auth.phoneNumber')}</label>
                <input
                  type="tel"
                  placeholder="+250788000000"
                  title={t('auth.phoneNumber')}
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
                {loading ? <><Spinner size="sm" /><span>{t('auth.sending')}</span></> : t('auth.sendResetCode')}
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="mb-8">
              <p className="font-bold text-white text-lg">{t('auth.enterResetCode')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('auth.checkSms')}</p>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="label">{t('auth.resetCode')}</label>
                <input
                  type="text"
                  placeholder={t('auth.pasteCode')}
                  title={t('auth.resetCode')}
                  className="input-field"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('auth.newPassword')}</label>
                <input
                  type="password"
                  placeholder={t('auth.newPasswordPlaceholder')}
                  title={t('auth.newPassword')}
                  className="input-field"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label">{t('auth.confirmPassword')}</label>
                <input
                  type="password"
                  placeholder={t('auth.confirmPassword')}
                  title={t('auth.confirmPassword')}
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
                {loading ? <><Spinner size="sm" /><span>{t('auth.resetting')}</span></> : t('auth.resetPassword')}
              </button>
              <button type="button" onClick={() => setStep('request')} className="w-full text-sm text-gray-400 underline text-center">
                {t('common.back')}
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
            <p className="font-bold text-white text-lg">{t('auth.passwordReset')}</p>
            <p className="text-gray-400 text-sm">{t('auth.passwordResetDesc')}</p>
            <button type="button" onClick={() => router.push('/auth/login')} className="btn-primary w-full py-4">
              {t('auth.goToSignIn')}
            </button>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.rememberPassword')}{' '}
            <Link href="/auth/login" className="text-white font-semibold underline underline-offset-2">
              {t('auth.signIn')}
            </Link>
          </p>
        )}
      </div>
    </MainLayout>
  );
}
