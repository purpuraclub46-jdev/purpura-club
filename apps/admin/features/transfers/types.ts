import type {
  InventoryLocationType,
  InventoryTransferStatus,
} from "@/types/api";

export interface TransferLocationRef {
  id: string;
  name: string;
  type: InventoryLocationType;
}

export interface TransferItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
}

export interface TransferEntity {
  id: string;
  number: string;
  fromLocation: TransferLocationRef;
  toLocation: TransferLocationRef;
  status: InventoryTransferStatus;
  notes: string | null;
  createdByUserName: string | null;
  items: TransferItem[];
  totalQuantity: number;
  createdAt: string;
  completedAt: string | null;
}

export interface TransferListQuery {
  page?: number;
  limit?: number;
  status?: InventoryTransferStatus;
  fromLocationId?: string;
  toLocationId?: string;
  search?: string;
}

export interface CreateTransferItemPayload {
  productId: string;
  quantity: number;
}

export interface CreateTransferPayload {
  fromLocationId: string;
  toLocationId: string;
  notes?: string;
  items: CreateTransferItemPayload[];
}

export const TRANSFER_STATUS_LABEL: Record<InventoryTransferStatus, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};
