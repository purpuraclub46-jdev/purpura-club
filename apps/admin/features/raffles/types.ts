import type { RaffleStatus, RaffleVisibility } from "@/types/api";

export interface RaffleEntity {
  id: string;
  title: string;
  slug: string;
  description: string;
  bannerImage: string | null;
  prizeImage: string | null;
  countdown: string | null;
  ticketPrice: number;
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
  memberTicketPrice: number;
  totalTickets: number;
  startDate: string;
  endDate: string;
  status?: RaffleStatus;
  visibility?: RaffleVisibility;
}

export type UpdateRafflePayload = Partial<CreateRafflePayload>;
