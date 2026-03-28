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
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) { toast.error('Phone number is required'); return; }
    if (!/^\+?[0-9]{10,15}$/.test(phoneNumber.trim())) { toast.error('Invalid phone number format'); return; }
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
    if (!token.trim()) { toast.error('Reset code is required'); return; }
    if (newPassword.length < 8) { toast.error(t('auth.passwordMin')); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) { toast.error(t('auth.passwordComplexity')); return; }
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

  const EyeIcon = ({ show }: { show: boolean }) => show ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

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
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder={t('auth.newPasswordPlaceholder')}
                    title={t('auth.newPassword')}
                    className="input-field pr-11"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon show={showNew} />
                  </button>
                </div>
              </div>
              <div>
                <label className="label">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder={t('auth.confirmPassword')}
                    title={t('auth.confirmPassword')}
                    className="input-field pr-11"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon show={showConfirm} />
                  </button>
                </div>
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
