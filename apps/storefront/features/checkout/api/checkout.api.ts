"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type {
  ApiResponse,
  CheckoutSessionResponse,
  CreateCheckoutSessionInput,
} from "@/types/api";

export const checkoutApi = {
  createSession: async (
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionResponse> => {
    const { data } = await httpClient.post<
      ApiResponse<CheckoutSessionResponse>
    >("/checkout/sessions", input);
    return unwrap(data);
  },
};
