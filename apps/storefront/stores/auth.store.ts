"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CustomerProfileSummary, Role } from "@/types/api";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
  customerProfile?: CustomerProfileSummary | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  hydrated: boolean;
  setSession: (user: AuthUser, tokens: AuthTokens) => void;
  setUser: (user: AuthUser) => void;
  setTokens: (tokens: AuthTokens) => void;
  clear: () => void;
  setHydrated: () => void;
}

const AUTH_COOKIE = "pp_storefront_authenticated";

const writeAuthCookie = (value: boolean) => {
  if (typeof document === "undefined") return;
  if (value) {
    document.cookie = `${AUTH_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=2592000`;
  } else {
    document.cookie = `${AUTH_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      hydrated: false,
      setSession: (user, tokens) => {
        writeAuthCookie(true);
        set({ user, tokens });
      },
      setUser: (user) => set({ user }),
      setTokens: (tokens) => {
        writeAuthCookie(true);
        set({ tokens });
      },
      clear: () => {
        writeAuthCookie(false);
        set({ user: null, tokens: null });
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "pp-storefront-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, tokens: state.tokens }),
      onRehydrateStorage: () => (state) => {
        if (state?.tokens) writeAuthCookie(true);
        state?.setHydrated();
      },
    },
  ),
);

export const getAccessToken = (): string | undefined =>
  useAuthStore.getState().tokens?.accessToken;

export const getRefreshToken = (): string | undefined =>
  useAuthStore.getState().tokens?.refreshToken;
