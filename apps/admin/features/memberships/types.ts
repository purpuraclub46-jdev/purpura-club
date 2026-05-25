import type { MembershipBenefitType } from "@/types/api";

export interface MembershipUserRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface MembershipEntity {
  id: string;
  user: MembershipUserRef;
  active: boolean;
  startedAt: string;
  expiresAt: string;
  daysRemaining: number;
  lastPurchaseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipBenefitLogEntity {
  id: string;
  type: MembershipBenefitType;
  description: string;
  amount: number | null;
  user: MembershipUserRef;
  orderNumber: string | null;
  createdAt: string;
}

export interface MembershipListQuery {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}

export interface BenefitLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: MembershipBenefitType;
  userId?: string;
}

export interface MembershipStats {
  activeMembers: number;
  expiredMembers: number;
  expiringSoon: number;
}

export const BENEFIT_TYPE_LABEL: Record<MembershipBenefitType, string> = {
  DISCOUNT: "Descuento",
  RAFFLE_ENTRY: "Participación de sorteo",
  REFERRAL_BONUS: "Bono por referido",
};
