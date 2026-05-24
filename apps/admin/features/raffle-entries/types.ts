import type {
  EntryStatus,
  EntryType,
  PaymentMethod,
} from "@/types/api";

export interface EntryRaffleSummary {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
}

export interface EntryUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface RaffleEntryEntity {
  id: string;
  userId: string;
  raffleId: string;
  ticketNumber: number;
  type: EntryType;
  status: EntryStatus;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  createdAt: string;
  raffle?: EntryRaffleSummary;
  user?: EntryUserSummary;
}

export interface EntryListQuery {
  page?: number;
  limit?: number;
  status?: EntryStatus;
  type?: EntryType;
  paymentMethod?: PaymentMethod;
  raffleId?: string;
  userId?: string;
}

export interface DecideEntryPayload {
  entryId: string;
  decision: "approve" | "reject";
}
