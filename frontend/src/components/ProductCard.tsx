import Link from 'next/link';
import { imageSrc } from '@/lib/api';
import { formatVND } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className={`card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md ${
        product.available ? '' : 'pointer-events-none opacity-60'
      }`}
      aria-disabled={!product.available}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc(product.imageUrl)} alt={product.name} className="aspect-square w-full object-cover" />
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-600">{product.category}</span>
        <h3 className="mt-1 font-semibold">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-bold">{formatVND(product.price)}</span>
          {product.available ? (
            <span className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700">Chọn</span>
          ) : (
            <span className="rounded-full bg-espresso/10 px-2 py-1 text-xs">Hết hàng</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card animate-pulse overflow-hidden">
      <div className="aspect-square bg-espresso/10" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 rounded bg-espresso/10" />
        <div className="h-4 w-2/3 rounded bg-espresso/10" />
        <div className="h-4 w-1/4 rounded bg-espresso/10" />
      </div>
    </div>
  );
}
