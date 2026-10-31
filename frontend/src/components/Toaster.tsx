'use client';

import { useToasts } from '@/store/toast';

const TONE: Record<string, string> = {
  success: 'bg-ink text-paper',
  info: 'bg-white text-ink border border-line',
  error: 'bg-brick-600 text-white',
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex max-w-md animate-toast-in items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${TONE[t.tone]}`}
        >
          <span className="whitespace-pre-line">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="-mr-1 ml-auto rounded px-1 opacity-70 hover:opacity-100"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
