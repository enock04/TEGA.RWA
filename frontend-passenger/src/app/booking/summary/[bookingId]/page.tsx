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
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    bookingsApi.getSummary(bookingId)
      .then(res => setBooking(res.data.data.booking))
      .catch(() => { toast.error('Booking not found'); router.push('/dashboard'); })
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await bookingsApi.cancel(bookingId);
      toast.success('Booking cancelled');
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

  if (!booking) return null;

  const isExpired = booking.status === 'expired' || (booking.expires_at && new Date(booking.expires_at) < new Date());

  return (
    <MainLayout>
      <AppHeader title="Booking Summary" showBack backHref="/dashboard" />

      <div className="px-4 py-5 space-y-4">
        {/* Status card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 font-mono">#{bookingId.slice(0, 8).toUpperCase()}</span>
            <Badge label={booking.status.toUpperCase()} status={booking.status} />
          </div>

          {groupIds.length > 0 && (
            <div className="bg-blue-950 border border-blue-800 rounded-xl p-3 mb-4 text-sm text-blue-300">
              Group booking: {groupIds.length + 1} seats reserved.{' '}
              <Link href="/dashboard" className="underline text-blue-400">View all in My Bookings</Link>
            </div>
          )}

          {booking.status === 'pending' && booking.expires_at && !isExpired && (
            <div className="bg-amber-950 border border-amber-800 rounded-xl p-3 mb-4 text-sm text-amber-400">
              Complete payment before {format(new Date(booking.expires_at), 'HH:mm')} to secure your seat.
            </div>
          )}

          {isExpired && (
            <div className="bg-red-950 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-400">
              This booking has expired. Please make a new booking.
            </div>
          )}

          {/* Route info */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
            <p className="font-bold text-white text-base mb-1">{booking.route_name}</p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{booking.departure_station}</span>
              <span className="text-gray-600">→</span>
              <span>{booking.arrival_station}</span>
            </div>
            {booking.departure_time && (
              <p className="text-sm text-amber-400 font-semibold mt-1.5">
                {format(new Date(booking.departure_time), 'EEE, dd MMM yyyy · HH:mm')}
              </p>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3 text-sm">
            <Row label="Passenger" value={booking.passenger_name} />
            <Row label="Phone" value={booking.passenger_phone} />
            {booking.passenger_email && <Row label="Email" value={booking.passenger_email} />}
            <div className="border-t border-gray-100" />
            <Row label="Bus" value={`${booking.bus_name} (${booking.plate_number})`} />
            <Row label="Seat" value={`#${booking.seat_number} (${booking.seat_class})`} />
            <div className="border-t border-gray-100" />
            <Row label="Amount" value={`RWF ${Number(booking.amount).toLocaleString()}`} bold amber />
          </div>
        </div>

        {/* Actions */}
        {booking.status === 'pending' && !isExpired && (
          <div className="space-y-2">
            <Link href={`/payment/${bookingId}`} className="btn-primary block text-center py-4">
              Proceed to Payment
            </Link>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-secondary w-full flex items-center justify-center gap-2 py-4"
            >
              {cancelling ? <Spinner size="sm" /> : null} Cancel Booking
            </button>
          </div>
        )}

        {booking.status === 'confirmed' && (
          <div className="space-y-2">
            <Link href={`/ticket/${bookingId}`} className="btn-primary block text-center py-4">
              View My Ticket
            </Link>
            <Link href="/dashboard" className="btn-secondary block text-center py-4">My Bookings</Link>
          </div>
        )}

        {(booking.status === 'cancelled' || isExpired) && (
          <Link href="/search" className="btn-primary block text-center py-4">Search New Bus</Link>
        )}
      </div>
    </MainLayout>
  );
}

function Row({ label, value, bold, amber }: { label: string; value: string; bold?: boolean; amber?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? `font-bold ${amber ? 'text-amber-400' : 'text-white'}` : 'text-gray-300 text-right max-w-[60%]'}>{value}</span>
    </div>
  );
}
