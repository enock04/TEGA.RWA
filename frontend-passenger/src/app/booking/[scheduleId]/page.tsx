'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import { schedulesApi, busesApi, bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Schedule, Seat } from '@/types';

interface PassengerForm {
  name: string;
  phone: string;
  email: string;
  disabled: boolean;
}

const SEAT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500'];

export default function BookingPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [passengerCount, setPassengerCount] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [passengers, setPassengers] = useState<PassengerForm[]>([{ name: '', phone: '', email: '', disabled: false }]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push(`/auth/login?next=/booking/${scheduleId}`);
      return;
    }
    if (user) {
      setPassengers([{ name: user.full_name ?? '', phone: user.phone_number ?? '', email: user.email ?? '', disabled: false }]);
    }
  }, [isLoading, isAuthenticated, user, scheduleId, router]);

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

  // Adjust passengers array when count changes
  const handleCountChange = (count: number) => {
    setPassengerCount(count);
    setSelectedSeats([]);
    setPassengers(prev => {
      const next = [...prev];
      while (next.length < count) next.push({ name: '', phone: '', email: '', disabled: false });
      return next.slice(0, count);
    });
  };

  const toggleSeat = (seat: Seat) => {
    if (seat.status === 'booked') return;
    const idx = selectedSeats.findIndex(s => s.id === seat.id);
    if (idx !== -1) {
      setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= passengerCount) {
        toast.error(`You can only select ${passengerCount} seat${passengerCount > 1 ? 's' : ''}`);
        return;
      }
      setSelectedSeats(prev => [...prev, seat]);
    }
  };

  const updatePassenger = (idx: number, field: keyof PassengerForm, value: string | boolean) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const seatStyle = (seat: Seat) => {
    if (seat.status === 'booked') return 'bg-gray-700 text-gray-500 cursor-not-allowed border-gray-600 opacity-50';
    const selIdx = selectedSeats.findIndex(s => s.id === seat.id);
    if (selIdx !== -1) return `${SEAT_COLORS[selIdx]} text-white border-transparent`;
    return 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:border-blue-500 cursor-pointer';
  };

  const handleSubmit = async () => {
    if (selectedSeats.length < passengerCount) {
      toast.error(`Please select ${passengerCount} seat${passengerCount > 1 ? 's' : ''}`);
      return;
    }
    for (let i = 0; i < passengerCount; i++) {
      if (!passengers[i].name.trim() || passengers[i].name.trim().length < 2) {
        toast.error(`Passenger ${i + 1}: name must be at least 2 characters`);
        return;
      }
      if (!/^\+?[0-9]{10,15}$/.test(passengers[i].phone.trim())) {
        toast.error(`Passenger ${i + 1}: invalid phone number`);
        return;
      }
      if (!passengers[i].email.trim()) {
        toast.error(`Passenger ${i + 1}: email is required`);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passengers[i].email.trim())) {
        toast.error(`Passenger ${i + 1}: invalid email address`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = passengers.slice(0, passengerCount).map((p, i) => ({
        seatId: selectedSeats[i].id,
        passengerName: p.name.trim(),
        passengerPhone: p.phone.trim(),
        passengerEmail: p.email.trim(),
        specialAssistance: p.disabled,
      }));

      const res = await bookingsApi.createBatch({ scheduleId, passengers: payload });
      const bookings: { id: string }[] = res.data.data.bookings;
      toast.success(bookings.length > 1
        ? `${bookings.length} seats reserved! Complete payment within 15 minutes.`
        : 'Seat reserved! Complete payment within 15 minutes.');

      const remaining = bookings.slice(1).map(b => b.id).join(',');
      router.push(`/booking/summary/${bookings[0].id}${remaining ? `?group=${remaining}` : ''}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <MainLayout>
      <AppHeader title="Book Seats" showBack backHref="/search" />
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Spinner /> <span>Loading schedule...</span>
      </div>
    </MainLayout>
  );

  if (!schedule) return null;

  const maxRows = Math.ceil(seats.length / 4);
  const availableCount = seats.filter(s => s.status !== 'booked').length;

  return (
    <MainLayout>
      <AppHeader title="Book Seats" showBack backHref="/search" />

      {/* Schedule strip */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <p className="font-bold text-white text-base">{schedule.route_name}</p>
        <div className="flex items-center gap-3 mt-1 text-gray-400 text-sm">
          <span>{format(new Date(schedule.departure_time), 'dd MMM · HH:mm')}</span>
          <span className="text-gray-600">•</span>
          <span>{schedule.bus_name}</span>
          <span className="ml-auto font-bold text-amber-400">RWF {Number(schedule.base_price).toLocaleString()} / seat</span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Passenger count picker */}
        <div className="card">
          <p className="font-semibold text-white mb-3">How many passengers?</p>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: Math.min(8, availableCount) }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleCountChange(n)}
                className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-all
                  ${passengerCount === n
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'}`}
              >
                {n}
              </button>
            ))}
          </div>
          {passengerCount > 1 && (
            <p className="text-xs text-gray-500 mt-2">
              Total: <span className="text-amber-400 font-semibold">RWF {(Number(schedule.base_price) * passengerCount).toLocaleString()}</span>
            </p>
          )}
        </div>

        {/* Seat map */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-white">
              {passengerCount > 1
                ? `Select ${passengerCount} seats (${selectedSeats.length} selected)`
                : 'Choose your seat'}
            </p>
            {selectedSeats.length > 0 && (
              <button type="button" onClick={() => setSelectedSeats([])} className="text-xs text-gray-500 hover:text-gray-300">
                Clear
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 border border-gray-700 rounded bg-gray-800 inline-block" />Available</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 border border-blue-500 rounded bg-blue-500 inline-block" />Selected</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 border border-gray-600 rounded bg-gray-700 opacity-50 inline-block" />Booked</span>
          </div>

          {/* Seat color legend for selected */}
          {passengerCount > 1 && selectedSeats.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedSeats.map((s, i) => (
                <span key={s.id} className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${SEAT_COLORS[i]}`}>
                  P{i + 1} → Seat {s.seat_number}
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 font-medium">Driver</div>
          </div>

          <div className="space-y-2">
            {Array.from({ length: maxRows }).map((_, rowIdx) => {
              const rowSeats = seats.slice(rowIdx * 4, rowIdx * 4 + 4);
              return (
                <div key={rowIdx} className="flex gap-2 justify-center">
                  {rowSeats.slice(0, 2).map(seat => (
                    <button key={seat.id} type="button" disabled={seat.status === 'booked'}
                      onClick={() => toggleSeat(seat)}
                      className={`w-12 h-12 rounded-xl text-xs font-semibold border-2 transition-all ${seatStyle(seat)}`}>
                      {seat.seat_number}
                    </button>
                  ))}
                  <div className="w-4" />
                  {rowSeats.slice(2, 4).map(seat => (
                    <button key={seat.id} type="button" disabled={seat.status === 'booked'}
                      onClick={() => toggleSeat(seat)}
                      className={`w-12 h-12 rounded-xl text-xs font-semibold border-2 transition-all ${seatStyle(seat)}`}>
                      {seat.seat_number}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Passenger forms */}
        <div className="card space-y-6">
          <p className="font-semibold text-white">Passenger Details</p>

          {Array.from({ length: passengerCount }, (_, i) => (
            <div key={i} className={`space-y-3 ${i > 0 ? 'pt-5 border-t border-gray-700' : ''}`}>
              <div className="flex items-center gap-2">
                {passengerCount > 1 && (
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white flex-shrink-0 ${SEAT_COLORS[i]}`}>
                    {i + 1}
                  </span>
                )}
                <p className="text-sm font-medium text-gray-300">
                  {i === 0 ? 'Primary Passenger (You)' : `Passenger ${i + 1}`}
                  {selectedSeats[i] && (
                    <span className="ml-2 text-xs text-gray-500">· Seat {selectedSeats[i].seat_number}</span>
                  )}
                </p>
              </div>

              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Passenger full name"
                  value={passengers[i]?.name ?? ''}
                  onChange={e => updatePassenger(i, 'name', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+250788000000"
                  value={passengers[i]?.phone ?? ''}
                  onChange={e => updatePassenger(i, 'phone', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="passenger@email.com"
                  value={passengers[i]?.email ?? ''}
                  onChange={e => updatePassenger(i, 'email', e.target.value)}
                />
              </div>

              {/* Disability question */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={passengers[i]?.disabled ?? false}
                    onChange={e => updatePassenger(i, 'disabled', e.target.checked)}
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                    ${passengers[i]?.disabled
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-600 bg-gray-800 group-hover:border-gray-400'}`}>
                    {passengers[i]?.disabled && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-300">This passenger has a disability or requires special assistance</p>
                  <p className="text-xs text-gray-500 mt-0.5">We&apos;ll ensure appropriate support is arranged</p>
                </div>
              </label>
            </div>
          ))}

          {/* Order summary */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 text-sm space-y-2">
            {selectedSeats.map((s, i) => (
              <div key={s.id} className="flex justify-between text-gray-400">
                <span>{passengerCount > 1 ? `Passenger ${i + 1}` : 'Seat'}</span>
                <span className="flex items-center gap-1.5">
                  #{s.seat_number}
                  {passengers[i]?.disabled && <span className="text-blue-400">♿</span>}
                </span>
              </div>
            ))}
            {selectedSeats.length === 0 && (
              <div className="flex justify-between text-gray-500"><span>Seats</span><span>None selected</span></div>
            )}
            <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2">
              <span>Total</span>
              <span className="text-amber-400">
                RWF {(Number(schedule.base_price) * passengerCount).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selectedSeats.length < passengerCount}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4"
          >
            {submitting ? <><Spinner size="sm" /><span>Reserving...</span></> : 'Continue to Payment'}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
