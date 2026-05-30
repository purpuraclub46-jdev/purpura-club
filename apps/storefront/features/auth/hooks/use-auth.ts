"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import {
  authApi,
  type ForgotPasswordPayload,
  type LoginPayload,
  type RegisterPayload,
} from "../api/auth.api";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export const useLogin = () => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (res) => setSession(res.user, res.tokens),
  });
};

export const useRegister = () => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (res) => setSession(res.user, res.tokens),
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) =>
      authApi.forgotPassword(payload),
  });
};

export const useLogout = () => {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clear();
      qc.clear();
    },
  });
};

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setUser = useAuthStore((s) => s.setUser);

  const meQuery = useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.me(),
    enabled: Boolean(tokens?.accessToken),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  return {
    user,
    isAuthenticated: Boolean(user && tokens),
    hydrated,
    isLoading: meQuery.isLoading,
  };
};
