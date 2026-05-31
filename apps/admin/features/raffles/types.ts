import type { RaffleStatus, RaffleVisibility } from "@/types/api";

/**
 * F2.7-B — Bloque pricing canónico devuelto por el backend en cada Raffle.
 * Fuente de verdad para el panel admin: muestra públicas y socio derivados,
 * sin permitir edición del precio socio.
 */
export interface RafflePricing {
  publicPrice: number;
  memberPrice: number;
  applicablePrice: number;
  savingPercentage: number;
  savingAmount: number;
  isMember: boolean;
  source: "PUBLIC" | "MEMBER";
}

export interface RaffleEntity {
  id: string;
  title: string;
  slug: string;
  description: string;
  bannerImage: string | null;
  prizeImage: string | null;
  countdown: string | null;
  ticketPrice: number;
  /** Derivado server-side (50 % de ticketPrice). No editable. */
  memberTicketPrice: number;
  totalTickets: number;
  soldTickets: number;
  remainingTickets: number;
  status: RaffleStatus;
  visibility: RaffleVisibility;
  winnerUserId: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  pricing: RafflePricing;
}

export interface RaffleListQuery {
  page?: number;
  limit?: number;
  timeFilter?: "upcoming" | "past" | "all";
  search?: string;
  status?: RaffleStatus;
  visibility?: RaffleVisibility;
}

export interface CreateRafflePayload {
  title: string;
  slug?: string;
  description: string;
  bannerImage?: string;
  prizeImage?: string;
  countdown?: string;
  ticketPrice: number;
  totalTickets: number;
  startDate: string;
  endDate: string;
  status?: RaffleStatus;
  visibility?: RaffleVisibility;
}

export type UpdateRafflePayload = Partial<CreateRafflePayload>;
