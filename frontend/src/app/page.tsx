'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import { schedulesApi } from '@/lib/api';

interface Coords { lat: number; lon: number; }
const KIGALI: Coords = { lat: -1.9441, lon: 30.0619 };

interface PopularRoute {
  id: string;
  route_name: string;
  departure_station: string;
  arrival_station: string;
  departure_time: string;
  base_price: number;
  available_seats: number;
}

export default function HomePage() {
  const { isAuthenticated, isLoading, user, initFromStorage } = useAuthStore();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locLabel, setLocLabel] = useState('Locating you…');
  const [routes, setRoutes] = useState<PopularRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (!navigator.geolocation) { setCoords(KIGALI); setLocLabel('Kigali, Rwanda'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }); setLocLabel('Your location'); },
      () => { setCoords(KIGALI); setLocLabel('Kigali, Rwanda (default)'); },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setRoutesLoading(true);
    schedulesApi.getAll({ limit: 6 })
      .then(res => {
        const data = res.data?.data?.schedules ?? res.data?.data ?? [];
        setRoutes(Array.isArray(data) ? data.slice(0, 6) : []);
      })
      .catch(() => setRoutes([]))
      .finally(() => setRoutesLoading(false));
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Spinner />
      </div>
    );
  }

  /* ── Authenticated home ── */
  if (isAuthenticated) {
    const firstName = user?.full_name?.split(' ')[0] ?? 'there';
    const mc = coords ?? KIGALI;
    const d = 0.06;
    const bbox = `${mc.lon - d},${mc.lat - d},${mc.lon + d},${mc.lat + d}`;
    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mc.lat},${mc.lon}`;

    return (
      <MainLayout>
        <AppHeader title="TEGA.Rw" />

        {/* Greeting */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-gray-400 text-sm">Good to see you,</p>
          <h2 className="text-white text-2xl font-bold">{firstName} 👋</h2>
        </div>

        {/* Map */}
        <div className="relative mx-4 rounded-2xl overflow-hidden border border-gray-700">
          <div className="absolute top-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <div className="bg-gray-900 bg-opacity-90 rounded-full px-3 py-1 flex items-center gap-1.5 shadow text-xs text-gray-300 font-medium">
              <svg className="w-3 h-3 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {locLabel}
            </div>
          </div>
          {coords ? (
            <iframe
              src={mapSrc}
              title="Your location"
              className="w-full h-52 border-0"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-52 bg-gray-800 flex items-center justify-center">
              <svg className="w-6 h-6 animate-pulse text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="px-4 pt-5 space-y-3">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Quick Actions</p>

          <Link href="/search"
            className="flex items-center gap-4 bg-gray-800 rounded-2xl px-4 py-4 border border-gray-700 active:bg-gray-700 transition-colors">
            <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Book a Bus</p>
              <p className="text-gray-500 text-xs">Search routes and reserve a seat</p>
            </div>
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link href="/dashboard"
            className="flex items-center gap-4 bg-gray-800 rounded-2xl px-4 py-4 border border-gray-700 active:bg-gray-700 transition-colors">
            <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">My Trips</p>
              <p className="text-gray-500 text-xs">View your bookings and tickets</p>
            </div>
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Popular Routes */}
        <div className="px-4 pt-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Popular Routes</p>
            <Link href="/search" className="text-xs text-gray-400 underline underline-offset-2">See all</Link>
          </div>

          {routesLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : routes.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <p className="text-gray-500 text-sm">No upcoming routes available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routes.map(route => (
                <Link
                  key={route.id}
                  href="/search"
                  className="flex items-center bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 gap-4 active:bg-gray-800 transition-colors"
                >
                  {/* Bus icon */}
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shrink-0 border border-gray-700">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v12M16 6v12M3 10h18M3 14h18M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>

                  {/* Route info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-white font-semibold text-sm truncate">{route.departure_station}</span>
                      <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span className="text-white font-semibold text-sm truncate">{route.arrival_station}</span>
                    </div>
                    {route.departure_time && (
                      <p className="text-gray-500 text-xs">
                        {format(new Date(route.departure_time), 'EEE, dd MMM · HH:mm')}
                      </p>
                    )}
                    {route.available_seats != null && (
                      <p className="text-gray-600 text-xs">{route.available_seats} seats left</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="text-amber-400 font-bold text-sm">
                      RWF {Number(route.base_price).toLocaleString()}
                    </p>
                    <p className="text-gray-600 text-xs">per seat</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  /* ── Unauthenticated splash ── */
  return (
    <MainLayout showNav={false}>
      <div className="flex flex-col min-h-screen bg-gray-950">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center shadow-xl mb-6 border border-gray-700">
            <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">TEGA.Rw</h1>
          <p className="text-gray-300 text-base font-medium mb-1">Inter-Provincial Bus Tickets</p>
          <p className="text-gray-500 text-sm">Rwanda&apos;s easiest way to book bus seats online</p>
        </div>
        <div className="px-6 pb-12 space-y-3">
          <Link href="/auth/login"
            className="block w-full bg-white text-gray-900 font-bold text-base py-4 rounded-2xl text-center active:scale-95 transition-transform shadow">
            Sign In
          </Link>
          <Link href="/auth/register"
            className="block w-full bg-gray-800 text-white font-semibold text-base py-4 rounded-2xl text-center border border-gray-700 active:scale-95 transition-transform">
            Create Account
          </Link>
          <p className="text-center text-gray-600 text-xs pt-1">
            Book your seat &bull; Pay with MoMo &bull; Get digital ticket
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
