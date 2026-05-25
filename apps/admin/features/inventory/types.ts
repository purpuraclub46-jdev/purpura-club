import type {
  InventoryLocationType,
  InventoryMovementType,
  StockLevel,
} from "@/types/api";

export interface StockRow {
  id: string;
  inventoryLocationId: string;
  locationName: string;
  locationType: InventoryLocationType;
  productId: string;
  productName: string;
  productSku: string;
  stock: number;
  reservedStock: number;
  minimumStock: number;
  availableStock: number;
  stockLevel: StockLevel;
  updatedAt: string;
}

export interface StockListQuery {
  page?: number;
  limit?: number;
  inventoryLocationId?: string;
  productId?: string;
  search?: string;
  lowStockOnly?: boolean;
}

export interface AdjustStockPayload {
  inventoryLocationId: string;
  productId: string;
  quantity: number;
  type: Extract<InventoryMovementType, "RESTOCK" | "ADJUSTMENT" | "LOSS">;
  reason?: string;
}

export interface UpdateMinimumStockPayload {
  inventoryLocationId: string;
  productId: string;
  minimumStock: number;
}

export interface ReserveStockPayload {
  inventoryLocationId: string;
  productId: string;
  quantity: number;
  reason?: string;
}

export interface InventoryMovementEntity {
  id: string;
  inventoryLocationId: string;
  locationName: string;
  locationType: InventoryLocationType;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  type: InventoryMovementType;
  reason: string | null;
  transferId: string | null;
  transferNumber: string | null;
  createdByUserId: string | null;
  createdByUserName: string | null;
  createdAt: string;
}

export interface MovementListQuery {
  page?: number;
  limit?: number;
  inventoryLocationId?: string;
  productId?: string;
  type?: InventoryMovementType;
}

export const MOVEMENT_TYPE_LABEL: Record<InventoryMovementType, string> = {
  SALE: "Venta",
  RESTOCK: "Reposición",
  TRANSFER_OUT: "Transferencia (salida)",
  TRANSFER_IN: "Transferencia (entrada)",
  ADJUSTMENT: "Ajuste",
  LOSS: "Pérdida",
  RESERVATION: "Reserva",
};

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = {
  OK: "Disponible",
  LOW: "Stock bajo",
  OUT_OF_STOCK: "Sin stock",
};
