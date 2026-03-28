'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import AppHeader from '@/components/layout/AppHeader';
import Spinner from '@/components/ui/Spinner';
import { agenciesApi } from '@/lib/api';

const EMPTY = {
  companyName: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  registrationNo: '',
  address: '',
  fleetSize: '',
  routesDescription: '',
};

export default function ApplyPage() {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) { toast.error('Company name is required'); return; }
    if (!form.contactName.trim()) { toast.error('Contact name is required'); return; }
    if (!form.contactPhone.trim()) { toast.error('Contact phone is required'); return; }
    if (!form.contactEmail.trim()) { toast.error('Contact email is required'); return; }

    setSaving(true);
    try {
      await agenciesApi.apply({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
        registrationNo: form.registrationNo.trim() || undefined,
        address: form.address.trim() || undefined,
        fleetSize: form.fleetSize ? parseInt(form.fleetSize) : undefined,
        routesDescription: form.routesDescription.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <MainLayout showNav={false}>
        <AppHeader title="Agency Application" showBack backHref="/" />
        <div className="px-5 py-16 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-white text-xl font-bold mb-2">Application Submitted</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Thank you! We will review your application and get back to you within 2–3 business days.
            </p>
          </div>
          <Link href="/" className="btn-primary w-full text-center py-3.5 mt-4">
            Back to Home
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showNav={false}>
      <AppHeader title="Agency Application" showBack backHref="/" />

      <div className="px-4 py-5 space-y-5">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
          <p className="text-white font-semibold text-sm mb-1">Partner with TEGA.Rw</p>
          <p className="text-gray-400 text-xs leading-relaxed">
            Register your bus company to manage schedules, bookings, and revenue through our platform.
            We'll review your application within 2–3 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company info */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Company Information</p>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Company Name *</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
                placeholder="e.g. Virunga Express Ltd"
                value={form.companyName}
                onChange={set('companyName')}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Registration No. (optional)</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
                placeholder="e.g. RW-TRS-001234"
                value={form.registrationNo}
                onChange={set('registrationNo')}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Address (optional)</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
                placeholder="KG 123 St, Kigali"
                value={form.address}
                onChange={set('address')}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Fleet Size (optional)</label>
              <input
                type="number"
                min="1"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
                placeholder="Number of buses"
                value={form.fleetSize}
                onChange={set('fleetSize')}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Routes You Operate (optional)</label>
              <textarea
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
                placeholder="e.g. Kigali–Musanze, Kigali–Huye"
                value={form.routesDescription}
                onChange={set('routesDescription')}
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Contact Person</p>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Full Name *</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
                placeholder="Your full name"
                value={form.contactName}
                onChange={set('contactName')}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Phone Number *</label>
              <input
                type="tel"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
                placeholder="+250788000000"
                value={form.contactPhone}
                onChange={set('contactPhone')}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Email Address *</label>
              <input
                type="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
                placeholder="you@company.rw"
                value={form.contactEmail}
                onChange={set('contactEmail')}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 disabled:opacity-60"
          >
            {saving && <Spinner size="sm" />}
            {saving ? 'Submitting…' : 'Submit Application'}
          </button>

          <p className="text-center text-xs text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gray-400 underline underline-offset-2">Sign in</Link>
          </p>
        </form>
      </div>
    </MainLayout>
  );
}
