import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Risk Intelligence',
  description: 'Procurement relationship graph for Lithuania',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
