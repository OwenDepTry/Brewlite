'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-espresso/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Brew<span className="text-brand-500">Lite</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link href="/" className="rounded-lg px-3 py-2 hover:bg-espresso/5">
            Menu
          </Link>
        </nav>
      </div>
    </header>
  );
}
