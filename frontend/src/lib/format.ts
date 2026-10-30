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
