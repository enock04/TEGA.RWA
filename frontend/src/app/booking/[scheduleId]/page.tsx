'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import { schedulesApi, busesApi, bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Schedule, Seat } from '@/types';

const schema = z.object({
  passengerName: z.string().min(2, 'Name must be at least 2 characters'),
  passengerPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  passengerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export default function BookingPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/booking/${scheduleId}`);
      return;
    }
    if (user) {
      setValue('passengerName', user.full_name);
      setValue('passengerPhone', user.phone_number);
      if (user.email) setValue('passengerEmail', user.email);
    }
  }, [isAuthenticated, user, scheduleId, router, setValue]);

  useEffect(() => {
    const load = async () => {
      try {
        const schedRes = await schedulesApi.getById(scheduleId);
        const sched = schedRes.data.data.schedule;
        setSchedule(sched);
        const seatRes = await busesApi.getSeats(sched.bus_id, scheduleId);
        setSeats(seatRes.data.data.seats);
      } catch {
        toast.error('Failed to load schedule details');
        router.push('/search');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scheduleId, router]);

  const onSubmit = async (data: FormData) => {
    if (!selectedSeat) { toast.error('Please select a seat'); return; }
    setSubmitting(true);
    try {
      const res = await bookingsApi.create({
        scheduleId,
        seatId: selectedSeat.id,
        passengerName: data.passengerName,
        passengerPhone: data.passengerPhone,
        ...(data.passengerEmail ? { passengerEmail: data.passengerEmail } : {}),
      });
      const bookingId = res.data.data.booking.id;
      toast.success('Seat reserved! Complete payment within 15 minutes.');
      router.push(`/booking/summary/${bookingId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const seatClassColor = (cls: string, status: string, selected: boolean) => {
    if (status === 'booked') return 'bg-gray-800 text-gray-600 cursor-not-allowed border-gray-700';
    if (selected) return 'bg-white text-gray-950 border-white';
    if (cls === 'vip') return 'bg-amber-950 text-amber-400 border-amber-800 hover:bg-amber-900 cursor-pointer';
    if (cls === 'business') return 'bg-purple-950 text-purple-400 border-purple-800 hover:bg-purple-900 cursor-pointer';
    return 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:border-gray-500 cursor-pointer';
  };

  if (loading) return (
    <MainLayout>
      <AppHeader title="Select Seat" showBack backHref="/search" />
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Spinner /> <span>Loading schedule...</span>
      </div>
    </MainLayout>
  );

  if (!schedule) return null;

  const maxRows = Math.ceil(seats.length / 4);

  return (
    <MainLayout>
      <AppHeader title="Select Seat" showBack backHref="/search" />

      {/* Schedule info strip */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <p className="font-bold text-white text-base">{schedule.route_name}</p>
        <div className="flex items-center gap-3 mt-1 text-gray-400 text-sm">
          <span>{format(new Date(schedule.departure_time), 'dd MMM · HH:mm')}</span>
          <span className="text-gray-600">•</span>
          <span>{schedule.bus_name}</span>
          <span className="ml-auto font-bold text-amber-400">RWF {Number(schedule.base_price).toLocaleString()}</span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Seat map */}
        <div className="card">
          <p className="font-semibold text-white mb-3">Choose your seat</p>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 border border-gray-700 rounded bg-gray-800 inline-block" />Economy</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 border border-purple-800 rounded bg-purple-950 inline-block" />Business</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 border border-amber-800 rounded bg-amber-950 inline-block" />VIP</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 border border-gray-700 rounded bg-gray-800 opacity-40 inline-block" />Booked</span>
          </div>

          {/* Driver label */}
          <div className="flex justify-end mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 font-medium">Driver</div>
          </div>

          {/* Seat grid */}
          <div className="space-y-2">
            {Array.from({ length: maxRows }).map((_, rowIdx) => {
              const rowSeats = seats.slice(rowIdx * 4, rowIdx * 4 + 4);
              return (
                <div key={rowIdx} className="flex gap-2 justify-center">
                  {rowSeats.slice(0, 2).map(seat => (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={seat.status === 'booked'}
                      onClick={() => seat.status !== 'booked' && setSelectedSeat(seat)}
                      className={`w-12 h-12 rounded-xl text-xs font-semibold border-2 transition-all ${seatClassColor(seat.seat_class, seat.status, selectedSeat?.id === seat.id)}`}
                    >
                      {seat.seat_number}
                    </button>
                  ))}
                  <div className="w-4" />
                  {rowSeats.slice(2, 4).map(seat => (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={seat.status === 'booked'}
                      onClick={() => seat.status !== 'booked' && setSelectedSeat(seat)}
                      className={`w-12 h-12 rounded-xl text-xs font-semibold border-2 transition-all ${seatClassColor(seat.seat_class, seat.status, selectedSeat?.id === seat.id)}`}
                    >
                      {seat.seat_number}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {selectedSeat && (
            <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white font-medium">
              Seat {selectedSeat.seat_number} selected
              <span className="ml-2 text-xs text-gray-400 capitalize">({selectedSeat.seat_class})</span>
            </div>
          )}
        </div>

        {/* Passenger form */}
        <div className="card">
          <p className="font-semibold text-white mb-4">Passenger Details</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input {...register('passengerName')} type="text" className="input-field" placeholder="Passenger full name" />
              {errors.passengerName && <p className="error-text">{errors.passengerName.message}</p>}
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input {...register('passengerPhone')} type="tel" className="input-field" placeholder="+250788000000" />
              {errors.passengerPhone && <p className="error-text">{errors.passengerPhone.message}</p>}
            </div>
            <div>
              <label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('passengerEmail')} type="email" className="input-field" placeholder="passenger@email.com" />
              {errors.passengerEmail && <p className="error-text">{errors.passengerEmail.message}</p>}
            </div>

            {/* Order summary */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 text-sm space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Seat</span>
                <span>{selectedSeat ? `#${selectedSeat.seat_number} (${selectedSeat.seat_class})` : '—'}</span>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2">
                <span>Total</span>
                <span className="text-amber-400">RWF {Number(schedule.base_price).toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedSeat}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4"
            >
              {submitting ? <><Spinner size="sm" /><span>Reserving...</span></> : 'Continue to Payment'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
