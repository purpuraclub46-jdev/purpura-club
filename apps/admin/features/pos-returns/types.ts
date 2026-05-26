import type {
  FiscalCustomerSnapshot,
  FiscalTotals,
  POSCreditNoteType,
  ReceiptSeriesType,
  SunatStatus,
} from "@/types/api";

export interface CreditNoteUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CreditNoteOrderSummary {
  id: string;
  number: string;
  total: number;
  receiptType: ReceiptSeriesType | null;
  receiptSeries: string | null;
  receiptNumber: number | null;
  formattedReceipt: string | null;
}

export interface CreditNoteItem {
  id: string;
  orderItemId: string | null;
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

export interface CreditNote {
  id: string;
  number: string;
  type: POSCreditNoteType;
  reason: string;
  notes: string | null;
  subtotal: number;
  total: number;
  refundedCash: number;
  fiscal: FiscalTotals;
  fiscalSnapshot: FiscalCustomerSnapshot;
  receiptType: ReceiptSeriesType | null;
  receiptSeries: string | null;
  receiptNumber: number | null;
  formattedReceipt: string | null;
  receiptIssuedAt: string | null;
  sunatStatus: SunatStatus;
  order: CreditNoteOrderSummary;
  exchangeOrder: CreditNoteOrderSummary | null;
  inventoryLocationId: string;
  inventoryLocationName: string;
  cashSessionId: string | null;
  createdBy: CreditNoteUserSummary;
  items: CreditNoteItem[];
  raffleEntriesReversed: number;
  membershipReverted: boolean;
  orderRefunded: boolean;
  createdAt: string;
}

export interface ReturnableOrderItem {
  orderItemId: string;
  productId: string;
  productName: string;
  quantitySold: number;
  quantityReturned: number;
  quantityAvailable: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReturnableOrderCustomer {
  id: string;
  fullName: string;
  dni: string | null;
  isMember: boolean;
}

export interface ReturnableOrder {
  id: string;
  number: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  receiptType: ReceiptSeriesType | null;
  receiptSeries: string | null;
  receiptNumber: number | null;
  formattedReceipt: string | null;
  createdAt: string;
  refundedTotal: number;
  hasOpenSession: boolean;
  fullyReturned: boolean;
  items: ReturnableOrderItem[];
  customer: ReturnableOrderCustomer | null;
  inventoryLocationId: string;
  inventoryLocationName: string;
  creditNotes: CreditNote[];
}

export interface CreateCreditNotePayload {
  orderId: string;
  type: POSCreditNoteType;
  reason: string;
  notes?: string;
  cashSessionId?: string;
  refundedCash?: number;
  items?: Array<{ orderItemId: string; quantity: number }>;
}

export const CREDIT_NOTE_TYPE_LABEL: Record<POSCreditNoteType, string> = {
  FULL_RETURN: "Devolución total",
  PARTIAL_RETURN: "Devolución parcial",
  PRODUCT_EXCHANGE: "Cambio de producto",
  SALE_CANCELLATION: "Anulación de venta",
};

export const CREDIT_NOTE_TYPE_DESCRIPTION: Record<POSCreditNoteType, string> = {
  FULL_RETURN:
    "Devuelve todos los items pendientes y reintegra el efectivo. Marca la venta como REFUNDED.",
  PARTIAL_RETURN:
    "Devuelve solo algunos items o cantidades. La venta queda parcialmente devuelta.",
  PRODUCT_EXCHANGE:
    "Devuelve items para procesar un cambio. Luego registras la nueva venta por separado.",
  SALE_CANCELLATION:
    "Anula la venta por completo (errores, fraude, cliente arrepentido). Equivale a FULL_RETURN.",
};
