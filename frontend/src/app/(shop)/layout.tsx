import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { MobileCartBar } from '@/components/MobileCartBar';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10 sm:pt-10">{children}</main>
      <Footer />
      <MobileCartBar />
    </>
  );
}
