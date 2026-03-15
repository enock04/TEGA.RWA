import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import I18nProvider from '@/providers/I18nProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'TEGA.Rw — Rwanda Bus Ticket Reservation',
  description: 'Book inter-provincial bus tickets in Rwanda quickly and securely.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '14px', maxWidth: '380px' },
            success: { iconTheme: { primary: '#057a55', secondary: '#fff' } },
            error: { iconTheme: { primary: '#e02424', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
