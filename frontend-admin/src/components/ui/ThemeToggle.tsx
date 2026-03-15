'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

export default function ThemeToggle() {
  const { isDark, init, toggle } = useThemeStore();

  useEffect(() => {
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 flex items-center justify-center rounded-full
                 hover:bg-gray-100 dark:hover:bg-gray-700
                 active:bg-gray-200 dark:active:bg-gray-600
                 transition-colors"
    >
      {isDark ? (
        /* Sun icon */
        <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 17a5 5 0 100-10 5 5 0 000 10zm0-12a1 1 0 001-1V3a1 1 0 00-2 0v1a1 1 0 001 1zm0 14a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1zm9-8h-1a1 1 0 000 2h1a1 1 0 000-2zM4 11H3a1 1 0 000 2h1a1 1 0 000-2zm14.66-5.07l-.71-.71a1 1 0 00-1.41 1.41l.71.71a1 1 0 001.41-1.41zM6.34 17.66l-.71-.71a1 1 0 00-1.41 1.41l.71.71a1 1 0 001.41-1.41zm12.02 1.41l.71-.71a1 1 0 00-1.41-1.41l-.71.71a1 1 0 001.41 1.41zM5.64 7.05l-.71.71A1 1 0 006.34 6.34l-.71-.7a1 1 0 00-1.41 1.41l.71.71-.29-.71z"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
        </svg>
      )}
    </button>
  );
}
