"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "../api/payments.api";
import type { PaymentDecisionPayload, PaymentReviewQuery } from "../types";

export const paymentsKeys = {
  all: ["payments"] as const,
  yape: (query: Omit<PaymentReviewQuery, "method">) =>
    [...paymentsKeys.all, "yape", query] as const,
  mercadopago: (query: Omit<PaymentReviewQuery, "method">) =>
    [...paymentsKeys.all, "mercadopago", query] as const,
};

export const useYapePayments = (
  query: Omit<PaymentReviewQuery, "method">,
) =>
  useQuery({
    queryKey: paymentsKeys.yape(query),
    queryFn: () => paymentsApi.listYape(query),
  });

export const useMercadoPagoPayments = (
  query: Omit<PaymentReviewQuery, "method">,
) =>
  useQuery({
    queryKey: paymentsKeys.mercadopago(query),
    queryFn: () => paymentsApi.listMercadoPago(query),
  });

export const useDecidePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentDecisionPayload) => paymentsApi.decide(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentsKeys.all }),
  });
};
