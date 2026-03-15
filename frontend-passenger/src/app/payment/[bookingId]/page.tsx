'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { Booking } from '@/types';

const schema = z.object({
  method: z.enum(['mtn_momo', 'airtel_money']),
  payerPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
});
type FormData = z.infer<typeof schema>;

type Step = 'form' | 'processing' | 'confirming';

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [paymentId, setPaymentId] = useState('');
  const [instructions, setInstructions] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { method: 'mtn_momo' },
  });

  const method = watch('method');

  useEffect(() => {
    bookingsApi.getSummary(bookingId)
      .then(res => {
        const b = res.data.data.booking;
        if (b.status !== 'pending') {
          if (b.status === 'confirmed') router.push(`/ticket/${bookingId}`);
          else { toast.error('Booking is not payable'); router.push('/dashboard'); }
          return;
        }
        setBooking(b);
      })
      .catch(() => { toast.error('Booking not found'); router.push('/dashboard'); })
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  const onSubmit = async (data: FormData) => {
    setStep('processing');
    try {
      const res = await paymentsApi.initiate({ bookingId, ...data });
      const { paymentId: pid, instructions: inst } = res.data.data;
      setPaymentId(pid);
      setInstructions(inst);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setStep('form');
    }
  };

  // Auto-poll payment status when processing (max 36 attempts = 3 min)
  useEffect(() => {
    if (step !== 'processing' || !paymentId) return;
    let attempts = 0;
    const MAX_ATTEMPTS = 36;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await paymentsApi.getByBooking(bookingId);
        const status = res.data.data.payment?.status;
        if (status === 'completed') {
          clearInterval(interval);
          toast.success('Payment confirmed! Your booking is now active.');
          router.push(`/ticket/${bookingId}`);
          return;
        }
        if (status === 'failed') {
          clearInterval(interval);
          toast.error('Payment failed. Please try again.');
          setStep('form');
          return;
        }
      } catch { /* ignore transient poll errors */ }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
        toast.error('Payment verification timed out. Please check your bookings.');
        router.push('/dashboard');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [step, paymentId, bookingId, router]);

  const handleConfirm = async () => {
    setStep('confirming');
    try {
      await paymentsApi.confirm(paymentId);
      toast.success('Payment confirmed! Your booking is now active.');
      router.push(`/ticket/${bookingId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment confirmation failed');
      setStep('processing');
    }
  };

  if (loading) return (
    <MainLayout>
      <AppHeader title="Payment" showBack backHref={`/booking/summary/${bookingId}`} />
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Spinner /><span>Loading...</span>
      </div>
    </MainLayout>
  );

  if (!booking) return null;

  return (
    <MainLayout>
      <AppHeader title="Complete Payment" showBack backHref={`/booking/summary/${bookingId}`} />

      <div className="px-4 py-5 space-y-4">
        {/* Amount due */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Amount Due</p>
          <p className="text-3xl font-bold text-amber-400">RWF {Number(booking.amount).toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2 text-gray-400 text-sm">
            <span>{booking.route_name}</span>
            <span className="text-gray-600">•</span>
            <span>Seat #{booking.seat_number}</span>
          </div>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Method selection */}
            <div className="card">
              <p className="font-semibold text-white mb-3 text-sm">Payment Method</p>
              <div className="space-y-2">
                {[
                  { value: 'mtn_momo', label: 'MTN MoMo', abbr: 'M', color: 'bg-yellow-400' },
                  { value: 'airtel_money', label: 'Airtel Money', abbr: 'A', color: 'bg-red-500' },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-center gap-3 p-3.5 border-2 rounded-2xl cursor-pointer transition-all ${
                    method === opt.value ? 'border-white/40 bg-gray-800' : 'border-gray-800 bg-gray-900'
                  }`}>
                    <input {...register('method')} type="radio" value={opt.value} className="sr-only" />
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${opt.color}`}>
                      {opt.abbr}
                    </div>
                    <span className="text-sm font-semibold text-white">{opt.label}</span>
                    {method === opt.value && (
                      <svg className="w-5 h-5 text-white ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">
                {method === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'} Phone Number
              </label>
              <input
                {...register('payerPhone')}
                type="tel"
                placeholder="+250788000000"
                className="input-field"
              />
              {errors.payerPhone && <p className="error-text">{errors.payerPhone.message}</p>}
              <p className="text-xs text-gray-400 mt-2">
                A payment prompt will be sent to this number. Enter your PIN to confirm.
              </p>
            </div>

            <button type="submit" className="btn-primary w-full py-4 text-base font-bold">
              Pay RWF {Number(booking.amount).toLocaleString()}
            </button>
          </form>
        )}

        {step === 'processing' && (
          <div className="card text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <p className="font-bold text-white text-lg">Check Your Phone</p>
              <p className="text-sm text-gray-400 mt-1">{instructions}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-gray-300">
              After entering your PIN, tap the button below to confirm.
            </div>
            <button type="button" onClick={handleConfirm} className="btn-primary w-full py-4">
              I&apos;ve Paid — Confirm Booking
            </button>
            <button type="button" onClick={() => setStep('form')} className="text-sm text-gray-400 underline">
              Go back
            </button>
          </div>
        )}

        {step === 'confirming' && (
          <div className="card text-center py-12 space-y-4">
            <Spinner size="lg" className="mx-auto" />
            <p className="text-gray-200 font-semibold">Confirming your payment...</p>
            <p className="text-sm text-gray-400">Please wait, do not close this page.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
