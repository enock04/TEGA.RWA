'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const groupIds = searchParams.get('group')?.split(',').filter(Boolean) ?? [];

  // All booking IDs covered by this single payment
  const allBookingIds = [bookingId, ...groupIds];
  const isGroup = groupIds.length > 0;

  // After payment confirmed, go back to the full summary with paid flag so it shows the email alert
  const summaryHref = `/booking/summary/${bookingId}?paid=1${isGroup ? `&group=${groupIds.join(',')}` : ''}`;

  const [bookings, setBookings] = useState<Booking[]>([]);
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
    Promise.all(allBookingIds.map(id => bookingsApi.getSummary(id).then(r => r.data.data.booking)))
      .then(results => {
        // If any booking is already confirmed, go to summary
        if (results.every(b => b.status === 'confirmed')) {
          router.push(summaryHref);
          return;
        }
        const unpayable = results.find(b => b.status !== 'pending' && b.status !== 'confirmed');
        if (unpayable) {
          toast.error('One or more bookings are not payable');
          router.push('/dashboard');
          return;
        }
        setBookings(results.filter(b => b.status === 'pending'));
      })
      .catch(() => { toast.error('Booking not found'); router.push('/dashboard'); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
  const primaryBooking = bookings[0] ?? null;

  const onSubmit = async (data: FormData) => {
    setStep('processing');
    try {
      let res;
      if (isGroup) {
        // One payment for all bookings combined
        res = await paymentsApi.initiateGroup({ bookingIds: allBookingIds, ...data });
      } else {
        res = await paymentsApi.initiate({ bookingId, ...data });
      }
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
          toast.success('Payment confirmed! Check your email for your ticket.');
          router.push(summaryHref);
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
  }, [step, paymentId, bookingId, router, summaryHref]);

  const handleConfirm = async () => {
    setStep('confirming');
    try {
      await paymentsApi.confirm(paymentId);
      toast.success(isGroup
        ? `Payment confirmed! Tickets sent to each passenger's email.`
        : 'Payment confirmed! Check your email for your ticket.');
      router.push(summaryHref);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment confirmation failed');
      setStep('processing');
    }
  };

  if (loading) return (
    <MainLayout>
      <AppHeader title="Payment" showBack backHref={summaryHref} />
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Spinner /><span>Loading...</span>
      </div>
    </MainLayout>
  );

  if (!primaryBooking) return null;

  return (
    <MainLayout>
      <AppHeader title="Complete Payment" showBack backHref={summaryHref} />

      <div className="px-4 py-5 space-y-4">
        {/* Amount due */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">
            {isGroup ? `Total Amount (${allBookingIds.length} passengers)` : 'Amount Due'}
          </p>
          <p className="text-3xl font-bold text-amber-400">RWF {totalAmount.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2 text-gray-400 text-sm">
            <span>{primaryBooking.route_name}</span>
          </div>

          {/* Per-passenger breakdown for groups */}
          {isGroup && bookings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800 space-y-1.5">
              {bookings.map((b, i) => (
                <div key={b.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {b.passenger_name} · Seat #{b.seat_number}
                  </span>
                  <span className="text-gray-400">RWF {Number(b.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {!isGroup && (
            <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm">
              <span>Seat #{primaryBooking.seat_number}</span>
              {primaryBooking.passenger_name && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{primaryBooking.passenger_name}</span>
                </>
              )}
            </div>
          )}
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
              Pay RWF {totalAmount.toLocaleString()}
              {isGroup && ` · ${allBookingIds.length} passengers`}
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
              I&apos;ve Paid — Confirm Booking{isGroup ? 's' : ''}
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
