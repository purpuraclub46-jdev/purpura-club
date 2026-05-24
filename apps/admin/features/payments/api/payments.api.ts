import { raffleEntriesApi } from "@/features/raffle-entries/api/raffle-entries.api";
import type { Paginated, PaymentMethod } from "@/types/api";
import type {
  PaymentDecisionPayload,
  PaymentReviewQuery,
  PaymentRow,
} from "../types";

/**
 * Payments sits on top of the raffle-entries resource — payment lifecycle
 * metadata lives on each RaffleEntry.
 *
 * Provider behaviour:
 *  - YAPE         → manual voucher approval (admin approves/rejects)
 *  - MERCADOPAGO  → webhook-driven (read-only for the admin)
 *  - FREE         → auto-confirmed by the backend on purchase
 */
const fetchByMethod = async (
  query: PaymentReviewQuery,
): Promise<Paginated<PaymentRow>> => {
  return raffleEntriesApi.list({
    page: query.page,
    limit: query.limit,
    status: query.status,
    raffleId: query.raffleId,
    paymentMethod: query.method,
  });
};

export const paymentsApi = {
  listYape: (
    query: Omit<PaymentReviewQuery, "method">,
  ): Promise<Paginated<PaymentRow>> =>
    fetchByMethod({ ...query, method: "YAPE" as PaymentMethod }),

  listMercadoPago: (
    query: Omit<PaymentReviewQuery, "method">,
  ): Promise<Paginated<PaymentRow>> =>
    fetchByMethod({ ...query, method: "MERCADOPAGO" as PaymentMethod }),

  decide: async (payload: PaymentDecisionPayload): Promise<void> => {
    await raffleEntriesApi.decide({
      entryId: payload.entryId,
      decision: payload.decision,
    });
  },
};
