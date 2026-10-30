import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite – Đặt cà phê không tiền mặt',
  description: 'Đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>
          <Header />
          <main className="mx-auto min-h-screen max-w-5xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
