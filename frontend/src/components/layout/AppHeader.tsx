'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  right?: ReactNode;
  transparent?: boolean;
}

export default function AppHeader({ title, showBack = false, backHref, right, transparent = false }: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  return (
    <div className={clsx('app-bar', transparent && 'bg-transparent border-transparent')}>
      <div className="w-10">
        {showBack && (
          <button type="button" onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
      <span className="app-bar-title text-center flex-1">{title}</span>
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  );
}
