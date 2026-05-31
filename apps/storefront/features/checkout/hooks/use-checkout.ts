"use client";

import { useMutation } from "@tanstack/react-query";
import type { CreateCheckoutSessionInput } from "@/types/api";
import { checkoutApi } from "../api/checkout.api";

export const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: (input: CreateCheckoutSessionInput) =>
      checkoutApi.createSession(input),
  });
};
