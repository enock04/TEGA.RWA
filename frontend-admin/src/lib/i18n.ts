import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import rw from '@/locales/rw.json';
import fr from '@/locales/fr.json';

export const LANGUAGES = [
  { code: 'en', label: 'English',     flag: '🇬🇧' },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'fr', label: 'Français',    flag: '🇫🇷' },
] as const;

export type LangCode = typeof LANGUAGES[number]['code'];

// Read persisted language from localStorage (client only)
function getSavedLang(): string {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem('i18nextLng') || 'en';
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        rw: { translation: rw },
        fr: { translation: fr },
      },
      lng: getSavedLang(),
      fallbackLng: 'en',
      supportedLngs: ['en', 'rw', 'fr'],
      interpolation: { escapeValue: false },
      initImmediate: false, // synchronous init — no async gap
    });
}

export default i18n;
