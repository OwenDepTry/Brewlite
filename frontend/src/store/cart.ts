'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Size, ToppingOption } from '@/lib/types';

export interface CartItem {
  /** productId + size + topping → cùng cấu hình thì gộp số lượng */
  key: string;
  productId: number;
  name: string;
  imageUrl: string;
  size: Size;
  toppings: ToppingOption[];
  /** Đơn giá 1 ly đã gồm size + topping (chỉ để hiển thị; server tính lại khi đặt) */
  unitPrice: number;
  qty: number;
}

export const MAX_QTY_PER_LINE = 20;

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

export function cartItemKey(productId: number, size: Size, toppingIds: number[]): string {
  return `${productId}|${size}|${[...toppingIds].sort((a, b) => a - b).join(',')}`;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const key = cartItemKey(item.productId, item.size, item.toppings.map((t) => t.id));
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, i.qty + item.qty) } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, key }] };
        }),
      setQty: (key, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, qty) } : i)),
        })),
      removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'brewlite-cart', storage: createJSONStorage(() => localStorage) },
  ),
);

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}
