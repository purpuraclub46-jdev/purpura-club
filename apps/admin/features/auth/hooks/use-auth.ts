"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/stores/auth.store";
import type { Role } from "@/types/api";

const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  const queryClient = useQueryClient();
  const router = useRouter();

  const isAuthenticated = Boolean(user && tokens);
  const isAdmin = Boolean(user && ADMIN_ROLES.includes(user.role));

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort
    }
    clear();
    queryClient.clear();
    router.replace("/login");
  }, [clear, queryClient, router]);

  return {
    user,
    tokens,
    hydrated,
    isAuthenticated,
    isAdmin,
    setSession,
    logout,
  };
};
