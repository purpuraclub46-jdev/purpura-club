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

export type InventoryLocationType = "ECOMMERCE" | "SUCURSAL" | "ALMACEN";

export type InventoryMovementType =
  | "SALE"
  | "RESTOCK"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUSTMENT"
  | "LOSS"
  | "RESERVATION";

export type InventoryTransferStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export type StockLevel = "OK" | "LOW" | "OUT_OF_STOCK";

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
export type OrderPaymentMethod = "MERCADOPAGO" | "YAPE" | "CASH" | "CARD";

// ─── Membership Engine ───────────────────────────
export type MembershipBenefitType =
  | "DISCOUNT"
  | "RAFFLE_ENTRY"
  | "REFERRAL_BONUS";

// ─── CRM ─────────────────────────────────────────
export type CustomerGender = "MASCULINO" | "FEMENINO" | "OTRO";
export type CustomerDocumentType = "DNI" | "RUC" | "CE" | "PASSPORT";

// ─── POS ─────────────────────────────────────────
export type POSCashSessionStatus = "OPEN" | "CLOSED";
export type POSCashMovementType =
  | "OPENING"
  | "SALE"
  | "INCOME"
  | "EXPENSE"
  | "CLOSING";
export type OrderChannel = "ECOMMERCE" | "POS";
export type ReceiptSeriesType =
  | "BOLETA"
  | "FACTURA"
  | "NOTA_CREDITO"
  | "NOTA_DEBITO"
  | "NOTA_VENTA";
export type POSCreditNoteType =
  | "FULL_RETURN"
  | "PARTIAL_RETURN"
  | "PRODUCT_EXCHANGE"
  | "SALE_CANCELLATION";

// ─── Fiscal (SUNAT Perú) ─────────────────────────
export type SunatStatus =
  | "PENDING"
  | "SUBMITTED"
  | "ACCEPTED"
  | "OBSERVED"
  | "REJECTED"
  | "CANCELLED";

export interface FiscalTotals {
  igvRate: number;
  subtotalUntaxed: number;
  igvAmount: number;
  total: number;
  pricesIncludeIgv: boolean;
}

export interface FiscalCustomerSnapshot {
  documentType: CustomerDocumentType | null;
  documentNumber: string | null;
  legalName: string | null;
  fiscalAddress: string | null;
  email: string | null;
}

export const DOCUMENT_TYPE_LABEL: Record<CustomerDocumentType, string> = {
  DNI: "DNI",
  RUC: "RUC",
  CE: "C. Extranjería",
  PASSPORT: "Pasaporte",
};

export const RECEIPT_TYPE_LABEL: Record<ReceiptSeriesType, string> = {
  BOLETA: "Boleta",
  FACTURA: "Factura",
  NOTA_CREDITO: "Nota de crédito",
  NOTA_DEBITO: "Nota de débito",
  NOTA_VENTA: "Nota de venta",
};

// ─── RBAC ────────────────────────────────────────
export interface PermissionEntity {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
  createdAt: string;
}

export interface RoleEntity {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  isOfficial: boolean;
  permissionKeys: string[];
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthRoleSummary {
  id: string;
  slug: string;
  name: string;
}

export interface AuthLocationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  accessLevel: Role;
  active: boolean;
  lastLoginAt: string | null;
  location: AuthLocationSummary | null;
  roles: AuthRoleSummary[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  active?: boolean;
  inventoryLocationId?: string;
  roleSlug?: string;
  search?: string;
}

export interface RoleListQuery {
  page?: number;
  limit?: number;
  active?: boolean;
  search?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dni?: string;
  inventoryLocationId?: string | null;
  roleIds?: string[];
  active?: boolean;
}

export interface UpdateUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  dni?: string;
  inventoryLocationId?: string | null;
  roleIds?: string[];
  active?: boolean;
}

export interface CreateRolePayload {
  name: string;
  slug?: string;
  description?: string;
  active?: boolean;
  permissionKeys?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  slug?: string;
  description?: string;
  active?: boolean;
  permissionKeys?: string[];
}
