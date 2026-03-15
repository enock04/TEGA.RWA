'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  // On mount, sync the stored language (SSR always uses 'en'; client corrects it here)
  useEffect(() => {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  }, []);

  // Persist every language change to localStorage
  useEffect(() => {
    const handler = (lang: string) => localStorage.setItem('i18nextLng', lang);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
