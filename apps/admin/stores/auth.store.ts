"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AuthLocationSummary,
  AuthRoleSummary,
  Role,
} from "@/types/api";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Nivel de acceso legacy (USER/ADMIN/SUPER_ADMIN). */
  role: Role;
  active?: boolean;
  location?: AuthLocationSummary | null;
  roles?: AuthRoleSummary[];
  /**
   * Permisos efectivos. Contiene exactamente ["*"] si el usuario es
   * SUPER_ADMIN — usar los helpers `userHasPermission` / `userHasAnyPermission`
   * para evaluar de forma segura. Puede venir `undefined` en sesiones
   * persistidas anteriores al rollout RBAC o en usuarios legacy.
   */
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
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

const AUTH_COOKIE = "pp_authenticated";

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
      name: "pp-admin-auth",
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

/**
 * Evalúa si el usuario actual tiene un permiso específico.
 * SUPER_ADMIN (`permissions = ["*"]` o `role === "SUPER_ADMIN"`) siempre pasa.
 * Defensivo frente a `permissions: undefined` (sesiones legacy) — degrada al
 * nivel de acceso para no romper a un usuario que aún no tiene RBAC resuelto.
 */
export const userHasPermission = (
  user: AuthUser | null,
  key: string,
): boolean => {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const permissions = user.permissions ?? [];
  if (permissions.includes("*")) return true;
  return permissions.includes(key);
};

/**
 * Evalúa si el usuario tiene al menos uno de los permisos indicados.
 * Defensivo: trata `permissions` undefined como un array vacío.
 */
export const userHasAnyPermission = (
  user: AuthUser | null,
  keys: readonly string[],
): boolean => {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const permissions = user.permissions ?? [];
  if (permissions.includes("*")) return true;
  if (keys.length === 0) return true;
  return keys.some((k) => permissions.includes(k));
};
