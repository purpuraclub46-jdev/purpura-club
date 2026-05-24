import type { EntryStatus, PaymentMethod } from "@/types/api";
import type { RaffleEntryEntity } from "@/features/raffle-entries/types";

export type PaymentRow = RaffleEntryEntity;

export interface PaymentReviewQuery {
  page?: number;
  limit?: number;
  status?: EntryStatus;
  raffleId?: string;
  method: PaymentMethod;
}

export interface PaymentDecisionPayload {
  entryId: string;
  decision: "approve" | "reject";
}
