import type { InventoryMovementType } from "@/types/api";

export interface InventoryRow {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  productSku: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  updatedAt: string;
}

export interface InventoryListQuery {
  page?: number;
  limit?: number;
  branchId?: string;
  productId?: string;
  search?: string;
  lowStockOnly?: boolean;
}

export interface AdjustStockPayload {
  branchId: string;
  productId: string;
  quantity: number;
  type: InventoryMovementType;
  reason?: string;
}

export interface TransferStockPayload {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  reason?: string;
}

export interface InventoryMovementEntity {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  type: InventoryMovementType;
  reason: string | null;
  createdByUserId: string | null;
  createdByUserName: string | null;
  createdAt: string;
}

export interface MovementListQuery {
  page?: number;
  limit?: number;
  branchId?: string;
  productId?: string;
  type?: InventoryMovementType;
}

export const MOVEMENT_TYPE_LABEL: Record<InventoryMovementType, string> = {
  SALE: "Venta",
  RESTOCK: "Reposición",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
  LOSS: "Pérdida",
};
