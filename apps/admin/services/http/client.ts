"use client";

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  getAccessToken,
  getRefreshToken,
  useAuthStore,
  type AuthTokens,
} from "@/stores/auth.store";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
const timeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 15000);

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  _skipAuth?: boolean;
}

export const httpClient: AxiosInstance = axios.create({
  baseURL,
  timeout,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

httpClient.interceptors.request.use((config) => {
  const cfg = config as RetriableConfig;
  if (cfg._skipAuth) return cfg;

  const token = getAccessToken();
  if (token) {
    cfg.headers.set("Authorization", `Bearer ${token}`);
  }
  return cfg;
});

let refreshPromise: Promise<AuthTokens> | null = null;

const refreshSession = async (): Promise<AuthTokens> => {
  const refreshToken = getRefreshToken();

  const response = await axios.post<ApiResponse<{ tokens: AuthTokens }>>(
    `${baseURL}/auth/refresh`,
    refreshToken ? { refreshToken } : {},
    {
      withCredentials: true,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    },
  );

  const tokens = response.data?.data?.tokens;
  if (!tokens) throw new Error("Refresh response missing tokens");

  useAuthStore.getState().setTokens(tokens);
  return tokens;
};

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retried &&
      !original._skipAuth &&
      !original.url?.includes("/auth/login") &&
      !original.url?.includes("/auth/refresh")
    ) {
      original._retried = true;

      try {
        refreshPromise = refreshPromise ?? refreshSession();
        const tokens = await refreshPromise;
        refreshPromise = null;

        original.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
        return httpClient.request(original);
      } catch (refreshError) {
        refreshPromise = null;
        useAuthStore.getState().clear();
        if (typeof window !== "undefined") {
          const path = window.location.pathname + window.location.search;
          if (!window.location.pathname.startsWith("/login")) {
            window.location.replace(
              `/login?next=${encodeURIComponent(path)}`,
            );
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const unwrap = <T>(payload: ApiResponse<T>): T => {
  if (!payload?.data && payload?.data !== null) {
    throw new Error("Invalid API response payload");
  }
  return payload.data as T;
};

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      "Unexpected network error"
    );
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error";
};

export type { AxiosRequestConfig };
