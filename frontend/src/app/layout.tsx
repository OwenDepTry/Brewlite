import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/Toaster';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite – Gọi cà phê, không cần tiền mặt',
  description: 'Gọi món trên điện thoại, trả bằng ví hoặc thẻ, tới quầy là có nước.',
};

export const viewport: Viewport = {
  themeColor: '#EEF0EA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {/* Be Vietnam Pro: thiết kế riêng cho dấu tiếng Việt. Bricolage Grotesque: tiêu đề. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
