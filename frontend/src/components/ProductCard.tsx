import Link from 'next/link';
import { imageSrc } from '@/lib/api';
import { formatVND } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const soldOut = !product.available;
  const lowStock = !soldOut && product.stock <= 5;

  const body = (
    <>
      <div className="relative overflow-hidden rounded-[26px] bg-jade-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc(product.imageUrl)}
          alt=""
          className={`aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${soldOut ? 'grayscale' : ''}`}
        />
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-paper">Hết hôm nay</span>
        )}
        {lowStock && (
          <span className="absolute left-3 top-3 rounded-full bg-milk-400 px-2.5 py-1 text-xs font-semibold text-ink">
            Còn {product.stock} ly
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 px-1 pt-3">
        <div className="min-w-0">
          <h3 className="truncate font-sans text-base font-semibold">{product.name}</h3>
          <p className="tabular text-ink-soft">{formatVND(product.price)}</p>
        </div>
        {!soldOut && (
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-lg text-ink transition-colors group-hover:border-jade-500 group-hover:bg-jade-500 group-hover:text-white"
          >
            +
          </span>
        )}
      </div>
    </>
  );

  if (soldOut) {
    return (
      <div className="opacity-70" aria-label={`${product.name} – hết hàng`}>
        {body}
      </div>
    );
  }

  return (
    <Link href={`/products/${product.id}`} className="group block rounded-[26px]" aria-label={`${product.name}, ${formatVND(product.price)}`}>
      {body}
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-[26px] bg-ink/5" />
      <div className="mt-3 h-4 w-2/3 rounded bg-ink/5" />
      <div className="mt-2 h-4 w-1/3 rounded bg-ink/5" />
    </div>
  );
}
