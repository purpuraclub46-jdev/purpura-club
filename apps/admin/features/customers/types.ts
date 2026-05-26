import type { CustomerDocumentType, CustomerGender } from "@/types/api";

export type { CustomerDocumentType, CustomerGender };

export interface CustomerLocationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface CustomerLinkedUser {
  id: string;
  email: string;
  active: boolean;
}

export interface CustomerStats {
  totalOrders: number;
  paidOrders: number;
  totalSpent: number;
  averageTicket: number;
  raffleEntries: number;
  wonRaffles: number;
  lastPurchaseAt: string | null;
}

export interface CustomerEntity {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  documentType: CustomerDocumentType;
  ruc: string | null;
  legalName: string | null;
  fiscalAddress: string | null;
  birthDate: string | null;
  gender: CustomerGender | null;
  notes: string | null;
  isMember: boolean;
  membershipExpiresAt: string | null;
  active: boolean;
  primaryLocation: CustomerLocationSummary | null;
  linkedUser: CustomerLinkedUser | null;
  stats: CustomerStats;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderEntry {
  id: string;
  number: string;
  status: string;
  paymentMethod: string;
  total: number;
  itemsCount: number;
  createdAt: string;
}

export interface CustomerRaffleEntry {
  id: string;
  ticketNumber: number;
  type: string;
  status: string;
  raffleId: string;
  raffleTitle: string;
  createdAt: string;
}

export interface CustomerWonPrize {
  id: string;
  title: string;
  position: number;
  raffleId: string;
  raffleTitle: string;
  winnerPublished: boolean;
  publishedAt: string | null;
}

export interface CustomerDetailEntity extends CustomerEntity {
  recentOrders: CustomerOrderEntry[];
  recentRaffleEntries: CustomerRaffleEntry[];
  wonPrizes: CustomerWonPrize[];
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  isMember?: boolean;
  primaryLocationId?: string;
  registeredFrom?: string;
  registeredTo?: string;
  minSpent?: number;
}

export interface CustomerOverviewStats {
  total: number;
  active: number;
  inactive: number;
  members: number;
  registeredLast30Days: number;
}

export interface CustomerSearchQuery {
  q?: string;
  limit?: number;
}

export interface CreateCustomerPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dni?: string;
  documentType?: CustomerDocumentType;
  ruc?: string;
  legalName?: string;
  fiscalAddress?: string;
  birthDate?: string;
  gender?: CustomerGender;
  notes?: string;
  primaryLocationId?: string | null;
  userId?: string | null;
  active?: boolean;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

export const GENDER_LABEL: Record<CustomerGender, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  OTRO: "Otro",
};
