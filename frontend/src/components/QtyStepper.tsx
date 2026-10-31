'use client';

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'h-8 w-8 text-base' : 'h-11 w-11 text-lg';
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-white">
      <button
        type="button"
        aria-label="Giảm số lượng"
        className={`${box} rounded-full font-medium text-ink-soft hover:text-ink disabled:opacity-30`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="w-7 text-center font-semibold tabular" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Tăng số lượng"
        className={`${box} rounded-full font-medium text-ink-soft hover:text-ink disabled:opacity-30`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
