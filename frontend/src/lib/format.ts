const vnd = new Intl.NumberFormat('vi-VN');

/** 45000 -> "45.000đ" */
export function formatVND(amount: number): string {
  return `${vnd.format(Math.round(amount))}đ`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "2026-10-31" -> "31/10" */
export function formatDayShort(day: string): string {
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
}

/** 1250000 -> "1,3 tr" ; 45000 -> "45k" (dùng cho trục biểu đồ) */
export function formatCompactVND(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(amount);
}

/** Date -> giá trị cho <input type="datetime-local"> theo giờ máy */
export function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
