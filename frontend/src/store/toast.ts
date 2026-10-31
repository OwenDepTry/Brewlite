'use client';

import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (message: string, tone: ToastTone = 'success') => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone }] });
    setTimeout(() => get().dismiss(id), tone === 'error' ? 6000 : 3500);
  },
  dismiss: (id: number) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Gọi được ở bất kỳ đâu: toast('Đã lưu'), toast(err.message, 'error') */
export function toast(message: string, tone: ToastTone = 'success') {
  useToasts.getState().push(message, tone);
}
