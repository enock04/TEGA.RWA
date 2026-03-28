'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { bookingsApi } from '@/lib/api';
import { Booking } from '@/types';

export default function BookingSummaryPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIds = searchParams.get('group')?.split(',').filter(Boolean) ?? [];
  const justPaid = searchParams.get('paid') === '1';

  // All booking IDs for this group: primary first, then the rest
  const allIds = [bookingId, ...groupIds];

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    Promise.all(allIds.map(id => bookingsApi.getSummary(id).then(r => r.data.data.booking)))
      .then(results => setBookings(results))
      .catch(() => { toast.error('Booking not found'); router.push('/dashboard'); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleCancel = async () => {
    if (!confirm(`Cancel all ${allIds.length} booking(s)?`)) return;
    setCancelling(true);
    try {
      await Promise.all(allIds.map(id => bookingsApi.cancel(id)));
      toast.success('Booking(s) cancelled');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <MainLayout>
      <AppHeader title="Booking Summary" showBack backHref="/dashboard" />
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Spinner /><span>Loading booking...</span>
      </div>
    </MainLayout>
  );

  if (!bookings.length) return null;

  const primary = bookings[0];
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
  const allStatuses = bookings.map(b => b.status);
  const overallStatus = allStatuses.every(s => s === 'confirmed') ? 'confirmed'
    : allStatuses.some(s => s === 'pending') ? 'pending'
    : allStatuses[0];

  const isExpired = primary.status === 'expired' || (primary.expires_at && new Date(primary.expires_at) < new Date());
  const isGroup = allIds.length > 1;

  // For payment: find the first pending booking to pay next
  const firstPending = bookings.find(b => b.status === 'pending');
  const remainingGroupForPayment = bookings
    .filter(b => b.id !== firstPending?.id && b.status === 'pending')
    .map(b => b.id)
    .join(',');

  const paymentHref = firstPending
    ? `/payment/${firstPending.id}${remainingGroupForPayment ? `?group=${remainingGroupForPayment}` : ''}`
    : null;

  return (
    <MainLayout>
      <AppHeader title="Booking Summary" showBack backHref="/dashboard" />

      <div className="px-4 py-5 space-y-4">

        {/* Email confirmation banner — shown once after successful payment */}
        {justPaid && (
          <div className="flex items-start gap-3 bg-emerald-950 border border-emerald-800 rounded-2xl p-4">
            <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-emerald-400 text-sm">Ticket{isGroup ? 's' : ''} sent to your email{isGroup ? 's' : ''}</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {isGroup
                  ? `Each passenger's ticket with QR code has been sent to their registered email address.`
                  : `Your ticket with QR code has been sent to your registered email address.`}
              </p>
            </div>
          </div>
        )}

        {/* Status bar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs text-gray-400 font-mono">#{bookingId.slice(0, 8).toUpperCase()}</span>
              {isGroup && (
                <span className="ml-2 text-xs bg-blue-900 text-blue-300 border border-blue-700 rounded-full px-2 py-0.5">
                  {allIds.length} passengers
                </span>
              )}
            </div>
            <Badge label={overallStatus.toUpperCase()} status={overallStatus} />
          </div>

          {overallStatus === 'pending' && primary.expires_at && !isExpired && (
            <div className="bg-amber-950 border border-amber-800 rounded-xl p-3 mb-4 text-sm text-amber-400">
              Complete payment before {format(new Date(primary.expires_at), 'HH:mm')} to secure your seat{isGroup ? 's' : ''}.
            </div>
          )}

          {isExpired && (
            <div className="bg-red-950 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-400">
              This booking has expired. Please make a new booking.
            </div>
          )}

          {/* Route info */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
            <p className="font-bold text-white text-base mb-1">{primary.route_name}</p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{primary.departure_station}</span>
              <span className="text-gray-600">→</span>
              <span>{primary.arrival_station}</span>
            </div>
            {primary.departure_time && (
              <p className="text-sm text-amber-400 font-semibold mt-1.5">
                {format(new Date(primary.departure_time), 'EEE, dd MMM yyyy · HH:mm')}
              </p>
            )}
          </div>

          {/* Passengers list */}
          <div className="space-y-3">
            {bookings.map((b, i) => (
              <div key={b.id} className={`rounded-xl border border-gray-700 bg-gray-800/60 p-4 ${i > 0 ? '' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {isGroup ? `Passenger ${i + 1}` : 'Passenger'}
                  </p>
                  <div className="flex items-center gap-2">
                    {b.status !== primary.status && (
                      <Badge label={b.status.toUpperCase()} status={b.status} />
                    )}
                    <span className="text-xs text-gray-500 font-mono">#{b.id.slice(0, 6).toUpperCase()}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <Row label="Name" value={b.passenger_name ?? '—'} />
                  <Row label="Phone" value={b.passenger_phone ?? '—'} />
                  <Row label="Seat" value={`#${b.seat_number} (${b.seat_class})`} />
                  <Row label="Bus" value={`${b.bus_name} · ${b.plate_number}`} />
                  <Row label="Fare" value={`RWF ${Number(b.amount).toLocaleString()}`} amber />
                  <Row label="Disability" value={b.special_assistance ? '♿ Special assistance required' : 'None'} />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          {isGroup && (
            <div className="mt-4 flex justify-between items-center border-t border-gray-700 pt-4">
              <span className="text-sm font-semibold text-gray-400">Total ({allIds.length} passengers)</span>
              <span className="text-xl font-bold text-amber-400">RWF {totalAmount.toLocaleString()}</span>
            </div>
          )}
          {!isGroup && (
            <div className="mt-4 flex justify-between items-center border-t border-gray-700 pt-4">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-xl font-bold text-amber-400">RWF {totalAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions — pending */}
        {overallStatus === 'pending' && !isExpired && paymentHref && (
          <div className="space-y-2">
            <Link href={paymentHref} className="btn-primary block text-center py-4">
              Proceed to Payment · RWF {totalAmount.toLocaleString()}
            </Link>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-secondary w-full flex items-center justify-center gap-2 py-4"
            >
              {cancelling ? <Spinner size="sm" /> : null}
              {isGroup ? `Cancel All ${allIds.length} Bookings` : 'Cancel Booking'}
            </button>
          </div>
        )}

        {/* Actions — confirmed: separate ticket per passenger */}
        {overallStatus === 'confirmed' && (
          <div className="space-y-2">
            {bookings.map((b, i) => (
              <Link
                key={b.id}
                href={`/ticket/${b.id}`}
                className="btn-primary block text-center py-4"
              >
                {isGroup ? `View Ticket — Passenger ${i + 1} (${b.passenger_name})` : 'View My Ticket'}
              </Link>
            ))}
            <Link href="/dashboard" className="btn-secondary block text-center py-4">My Bookings</Link>
          </div>
        )}

        {/* Mixed: some confirmed, some still pending */}
        {overallStatus === 'pending' && bookings.some(b => b.status === 'confirmed') && (
          <div className="space-y-2">
            {bookings.filter(b => b.status === 'confirmed').map((b, i) => (
              <Link key={b.id} href={`/ticket/${b.id}`} className="btn-secondary block text-center py-3.5">
                View Ticket — {b.passenger_name}
              </Link>
            ))}
          </div>
        )}

        {(overallStatus === 'cancelled' || isExpired) && (
          <Link href="/search" className="btn-primary block text-center py-4">Search New Bus</Link>
        )}
      </div>
    </MainLayout>
  );
}

function Row({ label, value, amber }: { label: string; value: string; amber?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right max-w-[60%] ${amber ? 'font-bold text-amber-400' : 'text-gray-300'}`}>{value}</span>
    </div>
  );
}
