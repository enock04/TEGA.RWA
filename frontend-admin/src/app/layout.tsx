import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import I18nProvider from '@/providers/I18nProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = { title: 'TEGA.Rw — Admin Portal', description: 'Admin management portal' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <I18nProvider>
          {children}
          <Toaster position="top-center" />
        </I18nProvider>
      </body>
    </html>
  );
}
