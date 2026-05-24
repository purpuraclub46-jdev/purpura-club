export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  details?: unknown;
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export type RaffleStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";
export type RaffleVisibility = "PUBLIC" | "PRIVATE";
export type EntryType =
  | "PURCHASE_REWARD"
  | "DIRECT_PURCHASE"
  | "REFERRAL"
  | "BONUS";
export type EntryStatus = "PENDING_PAYMENT" | "PAID" | "CANCELLED" | "WINNER";
export type PaymentMethod = "YAPE" | "FREE" | "MERCADOPAGO";

// ─── Ecommerce / Inventory ───────────────────────

export type CategoryGroup = "JOYERIA" | "PERFUMES" | "ACCESORIOS";

export type InventoryMovementType =
  | "SALE"
  | "RESTOCK"
  | "TRANSFER"
  | "ADJUSTMENT"
  | "LOSS";

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
export type OrderPaymentMethod = "MERCADOPAGO" | "YAPE" | "CASH" | "CARD";
