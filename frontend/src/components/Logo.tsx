import Link from 'next/link';

/** Biểu tượng phin cà phê + chữ BrewLite */
export function Logo({ href = '/', tone = 'dark' }: { href?: string; tone?: 'dark' | 'light' }) {
  const text = tone === 'dark' ? 'text-ink' : 'text-paper';
  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${text}`} aria-label="BrewLite – trang chủ">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="3" width="26" height="26" rx="9" className="fill-jade-500" />
        <path d="M9 11h14l-2 7.5a2 2 0 0 1-1.9 1.5h-6.2A2 2 0 0 1 11 18.5z" fill="#EEF0EA" />
        <rect x="8" y="9" width="16" height="2.4" rx="1.2" fill="#EDB443" />
        <circle cx="16" cy="23.5" r="1.4" fill="#EEF0EA" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight">BrewLite</span>
    </Link>
  );
}
