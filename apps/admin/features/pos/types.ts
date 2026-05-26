import type {
  CustomerDocumentType,
  FiscalCustomerSnapshot,
  FiscalTotals,
  InventoryLocationType,
  OrderPaymentMethod,
  OrderStatus,
  POSCashMovementType,
  POSCashSessionStatus,
  ReceiptSeriesType,
  SunatStatus,
} from "@/types/api";

// ─── Bootstrap / locations ────────────────────────────────────────────────

export interface PosLocation {
  id: string;
  name: string;
  slug: string;
  type: InventoryLocationType;
  active: boolean;
  cashRegistersCount: number;
  activeSessionId: string | null;
}

export interface PosBootstrap {
  availableLocations: PosLocation[];
  defaultLocationId: string | null;
}

export interface PosReceiptSeries {
  id: string;
  type: ReceiptSeriesType;
  series: string;
  nextNumber: number;
  active: boolean;
}

export interface PosReports {
  salesToday: number;
  ordersToday: number;
  salesMonth: number;
  ordersMonth: number;
  incomeToday: number;
  expenseToday: number;
  cashDifferenceToday: number;
}

// ─── Cash ────────────────────────────────────────────────────────────────

export interface CashRegisterSummary {
  id: string;
  name: string;
  active: boolean;
}

export interface CashSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface CashSessionMovement {
  id: string;
  type: POSCashMovementType;
  amount: number;
  reason: string | null;
  notes: string | null;
  orderId: string | null;
  orderNumber: string | null;
  createdBy: CashSessionUser | null;
  createdAt: string;
}

export interface PaymentMethodTotal {
  method: OrderPaymentMethod;
  total: number;
  count: number;
}

export interface CashSessionTotals {
  salesTotal: number;
  salesCount: number;
  incomeTotal: number;
  expenseTotal: number;
  expectedCash: number;
  byPaymentMethod: PaymentMethodTotal[];
}

export interface CashSession {
  id: string;
  cashRegisterId: string;
  cashRegister: CashRegisterSummary;
  status: POSCashSessionStatus;
  openedBy: CashSessionUser;
  closedBy: CashSessionUser | null;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  differenceAmount: number | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  totals: CashSessionTotals;
  movements: CashSessionMovement[];
}

export interface OpenSessionPayload {
  cashRegisterId?: string;
  openingAmount: number;
  notes?: string;
}

export interface CloseSessionPayload {
  closingAmount: number;
  notes?: string;
}

export type ManualMovementType = "INCOME" | "EXPENSE";

export interface CreateMovementPayload {
  type: ManualMovementType;
  amount: number;
  reason: string;
  notes?: string;
}

// ─── Sales ───────────────────────────────────────────────────────────────

export interface PosSaleItemPayload {
  productId: string;
  quantity: number;
}

export interface PosSalePaymentPayload {
  method: OrderPaymentMethod;
  amount: number;
  reference?: string;
}

export interface PosSaleCustomerFiscalPayload {
  documentType: CustomerDocumentType;
  documentNumber?: string;
  legalName?: string;
  fiscalAddress?: string;
  email?: string;
}

export interface CreatePosSalePayload {
  cashSessionId: string;
  items: PosSaleItemPayload[];
  payments: PosSalePaymentPayload[];
  customerId?: string;
  manualDiscount?: number;
  notes?: string;
  issueReceipt?: boolean;
  receiptType?: ReceiptSeriesType;
  customerFiscal?: PosSaleCustomerFiscalPayload;
}

export interface PosSaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  igvRate: number;
  unitPriceUntaxed: number;
  subtotalUntaxed: number;
  igvAmount: number;
}

export interface PosSalePayment {
  id: string;
  method: OrderPaymentMethod;
  amount: number;
  reference: string | null;
}

export interface PosSaleReceipt {
  type: ReceiptSeriesType;
  series: string;
  number: number;
  formatted: string;
  issuedAt: string;
  sunatStatus: SunatStatus;
}

export interface PosSaleCustomerSummary {
  id: string;
  fullName: string;
  dni: string | null;
  isMember: boolean;
}

export interface PosSale {
  id: string;
  number: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  fiscal: FiscalTotals;
  items: PosSaleItem[];
  payments: PosSalePayment[];
  receipt: PosSaleReceipt | null;
  customer: PosSaleCustomerSummary | null;
  fiscalSnapshot: FiscalCustomerSnapshot;
  raffleEntriesGenerated: number;
  membershipDiscountApplied: boolean;
  createdAt: string;
}

// ─── Labels ──────────────────────────────────────────────────────────────

export const MOVEMENT_TYPE_LABEL: Record<POSCashMovementType, string> = {
  OPENING: "Apertura",
  SALE: "Venta",
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
  CLOSING: "Cierre",
};

export const PAYMENT_METHOD_LABEL: Record<OrderPaymentMethod, string> = {
  MERCADOPAGO: "MercadoPago",
  YAPE: "Yape",
  CASH: "Efectivo",
  CARD: "Tarjeta",
};
