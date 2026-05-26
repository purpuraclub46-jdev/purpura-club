export interface PrizeWinnerRef {
  userId: string;
  fullName: string;
  email: string;
  dni: string | null;
  ticketNumber: number;
}

export interface PrizeEntity {
  id: string;
  raffleId: string;
  title: string;
  description: string | null;
  image: string | null;
  position: number;
  winner: PrizeWinnerRef | null;
  winnerPublished: boolean;
  winnerPhoto: string | null;
  winnerVideo: string | null;
  winnerAnnouncement: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrizePayload {
  title: string;
  description?: string;
  image?: string;
  position: number;
}

export type UpdatePrizePayload = Partial<CreatePrizePayload>;

export interface AssignWinnerPayload {
  ticketNumber: number;
}

export interface PublishWinnerPayload {
  winnerPhoto?: string;
  winnerVideo?: string;
  winnerAnnouncement?: string;
}
