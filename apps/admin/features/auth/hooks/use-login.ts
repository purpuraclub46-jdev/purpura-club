"use client";

import { useMutation } from "@tanstack/react-query";
import { authApi, type LoginPayload } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/stores/auth.store";

export const useLogin = () => {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (result) => {
      setSession(result.user, result.tokens);
    },
  });
};
