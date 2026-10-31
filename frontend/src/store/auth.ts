'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserRole } from '@/lib/types';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive?: boolean;
  loyaltyPoints: number;
}

export interface AuthResponse {
  accessToken: string;
  user: SessionUser;
}

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  setSession: (res: AuthResponse) => void;
  setUser: (user: SessionUser) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (res: AuthResponse) => set({ token: res.accessToken, user: res.user }),
      setUser: (user: SessionUser) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'brewlite-auth', storage: createJSONStorage(() => localStorage) },
  ),
);
