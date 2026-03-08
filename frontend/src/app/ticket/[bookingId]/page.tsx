'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import { ticketsApi } from '@/lib/api';
import { Ticket } from '@/types';

export default function TicketPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketsApi.getByBooking(bookingId)
      .then(res => setTicket(res.data.data.ticket))
      .catch(err => {
        if (err.response?.status === 404) {
          toast.error('Ticket not yet issued. Payment may still be processing.');
          router.push(`/booking/summary/${bookingId}`);
        } else {
          toast.error('Failed to load ticket');
        }
      })
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  const handlePrint = () => window.print();

  if (loading) return (
    <MainLayout>
      <AppHeader title="My Ticket" showBack backHref="/dashboard" />
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Spinner /><span>Loading your ticket...</span>
      </div>
    </MainLayout>
  );

  if (!ticket) return null;

  return (
    <MainLayout>
      <AppHeader title="My Ticket" showBack backHref="/dashboard" />

      <div className="px-4 py-5 space-y-4">
        {/* Success banner */}
        <div className="flex items-center gap-3 bg-emerald-950 border border-emerald-800 rounded-2xl p-4">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-emerald-400 text-sm">Booking Confirmed</p>
            <p className="text-xs text-emerald-600">Ticket sent to your phone and email.</p>
          </div>
        </div>

        {/* Ticket card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-lg">TEGA.Rw</p>
                <p className="text-gray-400 text-xs">Digital Bus Ticket</p>
              </div>
              {ticket.is_used && (
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">Used</span>
              )}
            </div>
          </div>

          {/* Ticket number */}
          <div className="px-5 py-3 bg-gray-800/50 border-b border-dashed border-gray-700">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Ticket Number</p>
            <p className="font-mono font-bold text-amber-400 text-base">{ticket.ticket_number}</p>
          </div>

          {/* Route */}
          <div className="px-5 py-4 border-b border-dashed border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">From</p>
                <p className="font-bold text-white text-base">{ticket.departure_station}</p>
              </div>
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">To</p>
                <p className="font-bold text-white text-base">{ticket.arrival_station}</p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="px-5 py-4 grid grid-cols-2 gap-4 text-sm border-b border-dashed border-gray-700">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Passenger</p>
              <p className="font-semibold text-white">{ticket.passenger_name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Phone</p>
              <p className="font-semibold text-white">{ticket.passenger_phone}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Departure</p>
              <p className="font-semibold text-white">
                {ticket.departure_time ? format(new Date(ticket.departure_time), 'dd MMM yyyy') : '—'}
              </p>
              <p className="text-gray-400 text-xs">
                {ticket.departure_time ? format(new Date(ticket.departure_time), 'HH:mm') : ''}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Seat</p>
              <p className="font-semibold text-white">#{ticket.seat_number}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Bus</p>
              <p className="font-semibold text-white">{ticket.bus_name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Plate</p>
              <p className="font-semibold text-white">{ticket.plate_number}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="px-5 py-5 flex flex-col items-center gap-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Scan at boarding</p>
            {ticket.qr_code_data ? (
              <img src={ticket.qr_code_data} alt="QR Code" className="w-40 h-40 rounded-xl" />
            ) : (
              <div className="w-40 h-40 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center text-xs text-gray-500">
                QR unavailable
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-800/50 px-5 py-3 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-500">
              Issued {format(new Date(ticket.issued_at), 'PPP p')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={handlePrint} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <Link href="/dashboard" className="btn-primary flex-1 text-center py-3.5">My Bookings</Link>
        </div>
      </div>
    </MainLayout>
  );
}
