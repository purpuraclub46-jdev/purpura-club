import type {
  InventoryLocationType,
  OrderPaymentMethod,
  OrderStatus,
} from "@/types/api";

export interface OrderItemEntity {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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

export interface OrderEntity {
  id: string;
  number: string;
  customer: OrderCustomerRef | null;
  location: OrderLocationRef | null;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: OrderPaymentMethod;
  status: OrderStatus;
  notes: string | null;
  items: OrderItemEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentMethod?: OrderPaymentMethod;
  inventoryLocationId?: string;
  userId?: string;
  search?: string;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  PROCESSING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const ORDER_PAYMENT_LABEL: Record<OrderPaymentMethod, string> = {
  MERCADOPAGO: "MercadoPago",
  YAPE: "Yape",
  CASH: "Efectivo",
  CARD: "Tarjeta",
};
