'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { stationsApi, routesApi } from '@/lib/api';
import { Station, Schedule } from '@/types';

interface Coords { lat: number; lon: number; }
const KIGALI: Coords = { lat: -1.9441, lon: 30.0619 };

export default function SearchPage() {
  return (
    <Suspense fallback={<MainLayout><div className="flex items-center justify-center py-20"><Spinner /></div></MainLayout>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation();

  const [stations, setStations] = useState<Station[]>([]);
  const [results, setResults] = useState<Schedule[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searched, setSearched] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locError, setLocError] = useState(false);
  const [sort, setSort] = useState<'earliest' | 'latest' | 'price_asc' | 'price_desc'>('earliest');

  const [form, setForm] = useState({
    departureStationId: params.get('from') || '',
    destinationStationId: params.get('to') || '',
    date: params.get('date') || format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    stationsApi.getAll()
      .then(res => setStations(res.data.data.stations ?? []))
      .catch(() => toast.error('Failed to load stations'))
      .finally(() => setLoadingStations(false));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setCoords(KIGALI); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => { setLocError(true); setCoords(KIGALI); },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (form.departureStationId && form.destinationStationId && form.date) {
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!form.departureStationId || !form.destinationStationId || !form.date) {
      toast.error(t('search.fillFields'));
      return;
    }
    if (form.departureStationId === form.destinationStationId) {
      toast.error(t('search.sameDeparture'));
      return;
    }
    setLoadingResults(true);
    setSearched(true);
    try {
      const res = await routesApi.search(form);
      setResults(res.data.data.schedules);
      if (res.data.data.schedules.length === 0) {
        toast(t('search.noResults'), { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Search failed. Please try again.');
    } finally {
      setLoadingResults(false);
    }
  };

  const formatTime = (iso: string) => format(new Date(iso), 'HH:mm');
  const formatDuration = (mins?: number) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}` : `${m}min`;
  };

  return (
    <MainLayout>
      <AppHeader title={t('search.findBus')} />

      {/* Search form */}
      <div className="bg-gray-900 px-4 pt-4 pb-5 border-b border-gray-800">
        {loadingStations ? (
          <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
            <Spinner size="sm" /> <span className="text-sm">{t('search.loadingStations')}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">{t('search.from')}</label>
              <select
                title={t('search.from')}
                className="input-field"
                value={form.departureStationId}
                onChange={e => setForm(f => ({ ...f, departureStationId: e.target.value }))}
              >
                <option value="">{t('search.selectDeparture')}</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">{t('search.to')}</label>
              <select
                title={t('search.to')}
                className="input-field"
                value={form.destinationStationId}
                onChange={e => setForm(f => ({ ...f, destinationStationId: e.target.value }))}
              >
                <option value="">{t('search.selectDestination')}</option>
                {stations
                  .filter(s => s.id !== form.departureStationId)
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 block">{t('search.travelDate')}</label>
              <input
                type="date"
                title={t('search.travelDate')}
                placeholder={t('search.travelDate')}
                className="input-field"
                value={form.date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={loadingResults}
              className="btn-primary w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-bold py-3.5 hover:bg-gray-100"
            >
              {loadingResults ? <Spinner size="sm" /> : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              {t('nav.searchBuses')}
            </button>
          </div>
        )}
      </div>

      {/* Map — shown before any search */}
      {!searched && !loadingResults && (() => {
        const mc = coords ?? KIGALI;
        const d = 0.06;
        const bbox = `${mc.lon - d},${mc.lat - d},${mc.lon + d},${mc.lat + d}`;
        const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mc.lat},${mc.lon}`;
        return (
          <div className="relative bg-gray-100 dark:bg-gray-800">
            <div className="absolute top-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
              <div className="bg-white dark:bg-gray-900 bg-opacity-90 rounded-full px-3 py-1 flex items-center gap-1.5 shadow text-xs text-gray-600 dark:text-gray-300 font-medium">
                <svg className="w-3 h-3 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                {!coords ? t('home.locating') : locError ? t('home.defaultLocation') : t('home.yourLocation')}
              </div>
            </div>
            {coords ? (
              <iframe
                src={src}
                title="Your location"
                className="w-full h-48 border-0"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center">
                <svg className="w-6 h-6 animate-pulse text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
            )}
          </div>
        );
      })()}

      {/* Results */}
      <div className="px-4 py-5">
        {loadingResults ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
            <Spinner /> <span>{t('search.searching')}</span>
          </div>
        ) : searched && results.length === 0 ? (
          <EmptyState
            title={t('search.noResults')}
            description={t('search.noResultsDesc')}
          />
        ) : results.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                {results.length} {results.length !== 1 ? t('search.availableRoutes') : t('search.available')}
              </p>
              <select
                title={t('common.search')}
                className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1.5"
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort)}
              >
                <option value="earliest">{t('search.sortEarliest')}</option>
                <option value="latest">{t('search.sortLatest')}</option>
                <option value="price_asc">{t('search.sortCheapest')}</option>
                <option value="price_desc">{t('search.sortPriciest')}</option>
              </select>
            </div>
            <div className="space-y-3">
              {[...results].sort((a, b) => {
                if (sort === 'earliest') return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
                if (sort === 'latest') return new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime();
                if (sort === 'price_asc') return Number(a.base_price) - Number(b.base_price);
                return Number(b.base_price) - Number(a.base_price);
              }).map((s) => (
                <div key={s.schedule_id} className="card p-4">
                  {/* Times */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-white text-xl">{formatTime(s.departure_time)}</span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-px bg-gray-700" />
                      <span className="text-xs text-gray-400 whitespace-nowrap px-1">
                        {formatDuration(s.duration_minutes)}
                      </span>
                      <div className="flex-1 h-px bg-gray-700" />
                    </div>
                    <span className="font-bold text-white text-xl">{formatTime(s.arrival_time)}</span>
                  </div>

                  {/* Stations */}
                  <div className="flex justify-between text-xs text-gray-500 mb-3">
                    <span>{s.departure_station}</span>
                    <span>{s.arrival_station}</span>
                  </div>

                  {/* Meta + price + action */}
                  <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500">{s.bus_name} &bull; {s.bus_type}</p>
                      <p className={`text-xs font-semibold ${s.available_seats < 5 ? 'text-red-500' : 'text-green-600'}`}>
                        {t('common.seatsLeft', { count: s.available_seats })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-base">RWF {Number(s.base_price).toLocaleString()}</p>
                      <button
                        type="button"
                        onClick={() => router.push(`/booking/${s.schedule_id}`)}
                        disabled={s.available_seats === 0}
                        className="btn-primary text-xs py-2 px-4 mt-1"
                      >
                        {s.available_seats === 0 ? t('search.noResults') : t('search.selectSeat')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">{t('search.fillFields')}</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
