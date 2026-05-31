"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse } from "@/types/api";
import type { AuthTokens, AuthUser } from "@/stores/auth.store";

export interface AuthResponsePayload {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /**
   * F2.7-C — Código de referido capturado de `?ref=` en /register. Opcional.
   * Si el código es inválido o no existe, el backend hace soft-fail (R1) y
   * el registro continúa sin linkage. El front simplemente lo reenvía tal cual.
   */
  referralCode?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponsePayload> => {
    const { data } = await httpClient.post<ApiResponse<AuthResponsePayload>>(
      "/auth/login",
      payload,
    );
    return unwrap(data);
  },

  register: async (payload: RegisterPayload): Promise<AuthResponsePayload> => {
    const { data } = await httpClient.post<ApiResponse<AuthResponsePayload>>(
      "/auth/register",
      payload,
    );
    return unwrap(data);
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await httpClient.get<ApiResponse<AuthUser>>("/auth/me");
    return unwrap(data);
  },

  logout: async (): Promise<void> => {
    await httpClient.post("/auth/logout");
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<void> => {
    await httpClient.post("/auth/forgot-password", payload);
  },
};
