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

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
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

// ─── Home stores (boutique showcase) ─────────────────────────────────────

export interface HomeStoreEntity {
  id: string;
  name: string;
  city: string;
  address: string;
  reference: string | null;
  whatsapp: string | null;
  schedule: string | null;
  mapsUrl: string | null;
  imageDesktop: string | null;
  imageMobile: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomeStorePayload {
  name: string;
  city: string;
  address: string;
  reference?: string;
  whatsapp?: string;
  schedule?: string;
  mapsUrl?: string;
  imageDesktop?: string;
  imageMobile?: string;
  sortOrder?: number;
  active?: boolean;
}

export type UpdateHomeStorePayload = Partial<CreateHomeStorePayload>;

// ─── Home categories (carrusel editorial) ────────────────────────────────

export type HomeCategorySlot =
  | "PERFUMES_HOMBRE"
  | "PERFUMES_MUJER"
  | "JOYAS_ACERO_DORADO"
  | "JOYAS_ACERO_PLATEADO"
  | "JOYAS_BANADAS_ORO"
  | "JOYAS_PLATA";

export interface HomeCategoryEntity {
  id: string;
  slot: HomeCategorySlot;
  sortOrder: number;
  active: boolean;
  eyebrow: string | null;
  label: string;
  ctaHref: string;
  imageDesktop: string | null;
  imageMobile: string | null;
  overlayColor: string;
  overlayOpacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHomeCategoryPayload {
  sortOrder?: number;
  active?: boolean;
  eyebrow?: string;
  label?: string;
  ctaHref?: string;
  imageDesktop?: string;
  imageMobile?: string;
  overlayColor?: string;
  overlayOpacity?: number;
}

// ─── Home banners ────────────────────────────────────────────────────────

export type HomeBannerSlot = "JEWELRY" | "PERFUME" | "RAFFLE" | "FLEXIBLE";
export type HomeBannerAlign = "LEFT" | "CENTER" | "RIGHT";

export interface HomeBannerEntity {
  id: string;
  slot: HomeBannerSlot;
  order: number;
  active: boolean;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  ctaHref: string;
  imageDesktop: string | null;
  imageMobile: string | null;
  overlayColor: string;
  overlayOpacity: number;
  align: HomeBannerAlign;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHomeBannerPayload {
  order?: number;
  active?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageDesktop?: string;
  imageMobile?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  align?: HomeBannerAlign;
}

// ─── Libro de Reclamaciones (INDECOPI · Peru) ────────────────────────────

export type ComplaintType = "RECLAMO" | "QUEJA";
export type ComplaintSubjectType = "PRODUCTO" | "SERVICIO";
export type ComplaintStatus = "PENDIENTE" | "EN_REVISION" | "RESUELTO";
export type ComplaintDocumentType = "DNI" | "CE" | "PASSPORT" | "RUC";

export interface ComplaintEntity {
  id: string;
  ticketNumber: string;
  firstName: string;
  lastName: string;
  documentType: ComplaintDocumentType;
  documentNumber: string;
  phone: string;
  email: string;
  address: string;
  isMinor: boolean;
  guardianFullName: string | null;
  guardianDocument: string | null;
  type: ComplaintType;
  subjectType: ComplaintSubjectType;
  subjectDetail: string;
  amount: number | null;
  description: string;
  consumerRequest: string;
  status: ComplaintStatus;
  response: string | null;
  internalNotes: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ComplaintStatus;
  type?: ComplaintType;
}

export interface UpdateComplaintPayload {
  status?: ComplaintStatus;
  response?: string;
  internalNotes?: string;
}

export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  RESUELTO: "Resuelto",
};

export const COMPLAINT_TYPE_LABEL: Record<ComplaintType, string> = {
  RECLAMO: "Reclamo",
  QUEJA: "Queja",
};

export const COMPLAINT_SUBJECT_LABEL: Record<ComplaintSubjectType, string> = {
  PRODUCTO: "Producto",
  SERVICIO: "Servicio",
};

export const COMPLAINT_DOCUMENT_LABEL: Record<ComplaintDocumentType, string> = {
  DNI: "DNI",
  CE: "Carné de extranjería",
  PASSPORT: "Pasaporte",
  RUC: "RUC",
};
