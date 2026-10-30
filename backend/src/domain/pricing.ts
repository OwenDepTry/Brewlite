/**
 * Quy tắc tính giá – viết thuần TypeScript (không phụ thuộc NestJS/TypeORM)
 * để dễ unit test. Đơn vị tiền: VND (số nguyên).
 */

export const SIZES = ['S', 'M', 'L'] as const;
export type Size = (typeof SIZES)[number];

/** Phụ thu theo size so với giá gốc (giá gốc = size S). */
export const SIZE_SURCHARGE: Record<Size, number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

export const SIZE_LABEL: Record<Size, string> = {
  S: 'Nhỏ',
  M: 'Vừa',
  L: 'Lớn',
};

export function isSize(value: unknown): value is Size {
  return typeof value === 'string' && (SIZES as readonly string[]).includes(value);
}

/** Đơn giá 1 ly = giá gốc + phụ thu size + tổng giá topping. */
export function unitPrice(basePrice: number, size: Size, toppingPrices: number[] = []): number {
  const toppings = toppingPrices.reduce((sum, p) => sum + p, 0);
  return basePrice + SIZE_SURCHARGE[size] + toppings;
}

export function lineTotal(unit: number, qty: number): number {
  return unit * qty;
}
