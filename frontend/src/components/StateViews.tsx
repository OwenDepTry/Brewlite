export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-brick-600/25 bg-brick-50 px-6 py-8 text-center">
      <p className="font-medium text-brick-600">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline mt-4">
          Thử lại
        </button>
      )}
    </div>
  );
}

export function EmptyView({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-xl font-bold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-soft" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-jade-500 border-t-transparent" />
      {label}
    </div>
  );
}
