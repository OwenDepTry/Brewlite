'use client';

import { useState } from 'react';
import { formatCompactVND, formatDayShort, formatVND } from '@/lib/format';

interface Point {
  day: string;
  revenue: number;
  orders: number;
}

/** Màu cột: xanh gạch bông đã kiểm tra độ tương phản và độ bão hòa trên nền trắng */
const BAR = '#0E8A72';
const BAR_TODAY = '#08473C';

const W = 720;
const H = 240;
const PAD = { top: 16, right: 8, bottom: 28, left: 48 };

function niceMax(v: number): number {
  if (v <= 0) return 100_000;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * mag >= v) return step * mag;
  }
  return 10 * mag;
}

/** Biểu đồ cột doanh thu theo ngày (một chuỗi số liệu, có tooltip và dạng bảng) */
export function RevenueChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const max = niceMax(Math.max(...data.map((d) => d.revenue), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / Math.max(data.length, 1);
  const barW = Math.min(24, band - 2);
  const labelEvery = data.length > 14 ? 5 : data.length > 7 ? 2 : 1;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const active = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" className="btn-ghost btn-sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th className="text-right">Số đơn</th>
                <th className="text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day}>
                  <td>{formatDayShort(d.day)}</td>
                  <td className="text-right tabular">{d.orders}</td>
                  <td className="text-right tabular">{formatVND(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Biểu đồ doanh thu theo ngày">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#E4E7DF" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#8A7F77">
                  {formatCompactVND(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = PAD.left + band * i + band / 2;
              const top = y(d.revenue);
              const h = PAD.top + innerH - top;
              const isToday = i === data.length - 1;
              const r = Math.min(4, h);
              return (
                <g key={d.day}>
                  {h > 0 && (
                    <path
                      d={`M${cx - barW / 2},${PAD.top + innerH} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${PAD.top + innerH} Z`}
                      fill={isToday ? BAR_TODAY : BAR}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  )}
                  {(i % labelEvery === 0 || isToday) && (
                    <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill={isToday ? '#231710' : '#8A7F77'} fontWeight={isToday ? 600 : 400}>
                      {isToday ? 'Hôm nay' : formatDayShort(d.day)}
                    </text>
                  )}
                  {/* vùng rê chuột rộng hơn cột */}
                  <rect
                    x={PAD.left + band * i}
                    y={PAD.top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${formatDayShort(d.day)}: ${formatVND(d.revenue)}, ${d.orders} đơn`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>
          {active && hover !== null && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs text-paper shadow-lg"
              style={{ left: `${((PAD.left + band * hover + band / 2) / W) * 100}%` }}
            >
              <p className="font-semibold">{formatDayShort(active.day)}</p>
              <p className="tabular">{formatVND(active.revenue)}</p>
              <p className="text-paper/70">{active.orders} đơn</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
