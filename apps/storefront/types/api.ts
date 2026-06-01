// ─── Shared API envelopes ────────────────────────────────────────────────

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

// ─── Identity ────────────────────────────────────────────────────────────

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface AuthLocationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface AuthRoleSummary {
  id: string;
  slug: string;
  name: string;
}

export type CustomerGender = "MASCULINO" | "FEMENINO" | "OTRO";

// Espejo TS del CustomerProfileSummaryDto del backend (FASE 1 D3).
// Embebido en /auth/me, /auth/login, /auth/register, /auth/refresh.
// CustomerDocumentType ya está declarado más abajo en la sección Orders.
export interface CustomerProfileSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  dni: string | null;
  documentType: CustomerDocumentType;
  ruc: string | null;
  legalName: string | null;
  fiscalAddress: string | null;
  birthDate: string | null;
  gender: CustomerGender | null;
  isMember: boolean;
  membershipExpiresAt: string | null;
  primaryLocationId: string | null;
}

// ─── Catalog ─────────────────────────────────────────────────────────────

export type CategoryGroup = "JOYERIA" | "PERFUMES" | "ACCESORIOS";
export type InventoryLocationType = "ECOMMERCE" | "SUCURSAL" | "ALMACEN";

export interface CategoryParentRef {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  group: CategoryGroup;
  order: number;
  active: boolean;
  parentId: string | null;
  parent: CategoryParentRef | null;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  order: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
}

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
  /**
   * F2.7-D — Grupo macro de la categoría. El storefront lo usa para
   * computar elegibilidad Club (JOYERIA + PERFUMES califican para el
   * beneficio +10% socio; ACCESORIOS no).
   */
  group: CategoryGroup;
}

export interface ProductAvailabilitySlot {
  inventoryLocationId: string;
  locationName: string;
  locationSlug: string;
  locationType: InventoryLocationType;
  active: boolean;
  stock: number;
  minimumStock: number;
}

export interface ProductEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  cost: number;
  discountPercentage: number | null;
  discountActive: boolean;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  salePrice: number | null;
  memberPrice: number | null;
  finalPrice: number;
  featured: boolean;
  active: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: ProductCategoryRef[];
  availability: ProductAvailabilitySlot[];
  inventory: { totalStock: number; totalReserved: number };
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLocationEntity {
  id: string;
  name: string;
  slug: string;
  type: InventoryLocationType;
  address: string | null;
  phone: string | null;
  active: boolean;
  productsTracked: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Raffles ─────────────────────────────────────────────────────────────

export type RaffleStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";
export type RaffleVisibility = "PUBLIC" | "PRIVATE";

export interface RafflePrize {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  position: number;
  winnerPublished: boolean;
  winnerPhoto: string | null;
  winnerVideo: string | null;
  publishedAt: string | null;
}

/**
 * F2.7-B — Bloque pricing canónico devuelto por el backend en cada Raffle.
 * Es la fuente de verdad para el frontend; los campos legacy
 * `ticketPrice` / `memberTicketPrice` se conservan para compatibilidad.
 */
export interface RafflePricing {
  publicPrice: number;
  memberPrice: number;
  /** Precio que se cobraría al solicitante (member si socio, public si no). */
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
  /** Precio público — fuente legacy. Preferí `pricing.publicPrice`. */
  ticketPrice: number;
  /** Precio socio derivado — fuente legacy. Preferí `pricing.memberPrice`. */
  memberTicketPrice: number;
  totalTickets: number;
  soldTickets: number;
  status: RaffleStatus;
  visibility: RaffleVisibility;
  startDate: string;
  endDate: string;
  countdown: string | null;
  prizes: RafflePrize[];
  createdAt: string;
  updatedAt: string;
  /** F2.7-B — Bloque pricing resuelto al usuario actual. Fuente canónica. */
  pricing: RafflePricing;
}

// ─── Memberships ─────────────────────────────────────────────────────────

export interface MembershipEntity {
  id: string;
  userId: string;
  active: boolean;
  startedAt: string;
  expiresAt: string;
  /**
   * F2.7-D — Días enteros restantes hasta `expiresAt`, calculados por el
   * backend al armar la response. Negativo si ya venció, null si la
   * membresía nunca se activó.
   */
  daysRemaining: number | null;
  lastPurchaseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Orders / Fiscal ─────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
export type OrderPaymentMethod = "MERCADOPAGO" | "YAPE" | "CASH" | "CARD";
export type OrderChannel = "ECOMMERCE" | "POS";
export type ReceiptSeriesType =
  | "BOLETA"
  | "FACTURA"
  | "NOTA_CREDITO"
  | "NOTA_DEBITO"
  | "NOTA_VENTA";
export type CustomerDocumentType = "DNI" | "RUC" | "CE" | "PASSPORT";

export interface OrderItemEntity {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  igvRate: number;
  unitPriceUntaxed: number;
  subtotalUntaxed: number;
  igvAmount: number;
}

export interface OrderCustomerRef {
  id: string;
  email: string;
  fullName: string;
}

export interface OrderLocationRef {
  id: string;
  name: string;
  type: InventoryLocationType;
}

export interface OrderShippingSnapshot {
  addressId: string | null;
  recipientName: string;
  recipientPhone: string;
  street: string;
  number: string;
  apartment: string | null;
  district: string;
  province: string;
  region: string;
  countryCode: string;
  reference: string | null;
}

export interface OrderEntity {
  id: string;
  number: string;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  customer: OrderCustomerRef | null;
  location: OrderLocationRef | null;
  shipping: OrderShippingSnapshot | null;
  items: OrderItemEntity[];
  fiscal: {
    igvRate: number;
    subtotalUntaxed: number;
    igvAmount: number;
    total: number;
    pricesIncludeIgv: boolean;
  };
  fiscalSnapshot: {
    documentType: CustomerDocumentType | null;
    documentNumber: string | null;
    legalName: string | null;
    fiscalAddress: string | null;
    email: string | null;
  };
  receipt: {
    type: ReceiptSeriesType;
    series: string;
    number: number;
    formatted: string;
    issuedAt: string;
    sunatStatus: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Raffle entries (customer self-service) ──────────────────────────────

export type EntryType =
  | "PURCHASE_REWARD"
  | "DIRECT_PURCHASE"
  | "REFERRAL"
  | "BONUS";

export type EntryStatus = "PENDING_PAYMENT" | "PAID" | "CANCELLED" | "WINNER";

export interface RaffleEntryEntity {
  id: string;
  raffleId: string;
  raffleTitle: string;
  raffleSlug?: string;
  ticketNumber: number;
  type: EntryType;
  status: EntryStatus;
  createdAt: string;
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

// ─── Display labels ──────────────────────────────────────────────────────

export const RAFFLE_ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  PURCHASE_REWARD: "Por compra",
  DIRECT_PURCHASE: "Compra directa",
  REFERRAL: "Referido",
  BONUS: "Bono",
};

export const RAFFLE_ENTRY_STATUS_LABEL: Record<EntryStatus, string> = {
  PENDING_PAYMENT: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
  WINNER: "Ganador",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  PROCESSING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Devuelto",
};

export const ORDER_PAYMENT_METHOD_LABEL: Record<OrderPaymentMethod, string> = {
  MERCADOPAGO: "MercadoPago",
  YAPE: "Yape",
  CASH: "Efectivo",
  CARD: "Tarjeta",
};

export const RECEIPT_TYPE_LABEL: Record<ReceiptSeriesType, string> = {
  BOLETA: "Boleta",
  FACTURA: "Factura",
  NOTA_CREDITO: "Nota de crédito",
  NOTA_DEBITO: "Nota de débito",
  NOTA_VENTA: "Nota de venta",
};

// ─── Customer addresses (F2.5) ───────────────────────────────────────────

export type AddressType = "SHIPPING" | "BILLING" | "PICKUP";

export const ADDRESS_TYPE_LABEL: Record<AddressType, string> = {
  SHIPPING: "Envío",
  BILLING: "Facturación",
  PICKUP: "Retiro en tienda",
};

export interface AddressEntity {
  id: string;
  type: AddressType;
  label: string | null;
  recipientName: string;
  recipientPhone: string;
  street: string;
  number: string;
  apartment: string | null;
  district: string;
  province: string;
  region: string;
  countryCode: string;
  reference: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  type?: AddressType;
  label?: string;
  recipientName: string;
  recipientPhone: string;
  street: string;
  number: string;
  apartment?: string;
  district: string;
  province: string;
  region: string;
  countryCode?: string;
  reference?: string;
  isDefault?: boolean;
}

export type UpdateAddressInput = Partial<CreateAddressInput>;

// ─── Checkout (F2.6-A) ───────────────────────────────────────────────────

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

export interface CreateCheckoutSessionInput {
  shippingAddressId: string;
  items: CheckoutItemInput[];
  paymentMethod?: OrderPaymentMethod;
  notes?: string;
}

export type CheckoutSessionVerdict =
  | "REDIRECT"
  | "PENDING_SETUP"
  | "UNSUPPORTED";

export interface CheckoutSessionResponse {
  orderId: string;
  orderNumber: string;
  verdict: CheckoutSessionVerdict;
  redirectUrl: string | null;
  provider: string;
  mode: "sandbox" | "production" | "none";
  message: string;
}

// ─── Libro de Reclamaciones (INDECOPI · Peru) ────────────────────────────

export type ComplaintType = "RECLAMO" | "QUEJA";
export type ComplaintSubjectType = "PRODUCTO" | "SERVICIO";
export type ComplaintStatus = "PENDIENTE" | "EN_REVISION" | "RESUELTO";
export type ComplaintDocumentType = "DNI" | "CE" | "PASSPORT" | "RUC";

export interface CreateComplaintPayload {
  firstName: string;
  lastName: string;
  documentType?: ComplaintDocumentType;
  documentNumber: string;
  phone: string;
  email: string;
  address: string;
  isMinor?: boolean;
  guardianFullName?: string;
  guardianDocument?: string;
  type: ComplaintType;
  subjectType: ComplaintSubjectType;
  subjectDetail: string;
  amount?: number;
  description: string;
  consumerRequest: string;
}

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

// ─── Referrals (F2.7-C) ──────────────────────────────────────────────────
//
// Espejo de los DTOs en apps/api/src/modules/referrals/dto/referral-me.dto.ts.
// El backend ofusca nombres (Pedro G.) para proteger PII (R8).

export type ReferralHistoryStatus = "PENDING_PURCHASE" | "QUALIFIED";

export const REFERRAL_HISTORY_STATUS_LABEL: Record<
  ReferralHistoryStatus,
  string
> = {
  PENDING_PURCHASE: "Sin compra aún",
  QUALIFIED: "Compra válida",
};

export interface ReferralStats {
  registered: number;
  qualified: number;
  ticketsEarned: number;
}

export interface ReferralHistoryItem {
  id: string;
  displayName: string;
  status: ReferralHistoryStatus;
  ticketsAwarded: number;
  createdAt: string;
  rewardedAt: string | null;
}

export interface ReferralOverview {
  referralCode: string;
  referralUrl: string;
  stats: ReferralStats;
  history: ReferralHistoryItem[];
}
