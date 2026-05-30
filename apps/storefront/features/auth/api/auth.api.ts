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
