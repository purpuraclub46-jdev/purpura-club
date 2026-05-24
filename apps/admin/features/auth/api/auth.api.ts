import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse } from "@/types/api";
import type { AuthTokens, AuthUser } from "@/stores/auth.store";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResultPayload {
  user: AuthUser;
  tokens: AuthTokens;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResultPayload> => {
    const { data } = await httpClient.post<ApiResponse<AuthResultPayload>>(
      "/auth/login",
      payload,
      { _skipAuth: true } as never,
    );
    return unwrap(data);
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await httpClient.get<ApiResponse<AuthUser>>("/auth/me");
    return unwrap(data);
  },

  logout: async (): Promise<void> => {
    await httpClient.post<ApiResponse<null>>("/auth/logout");
  },
};
