import type { InventoryLocationType } from "@/types/api";

export interface LocationEntity {
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

export interface LocationListQuery {
  page?: number;
  limit?: number;
  type?: InventoryLocationType;
  active?: boolean;
  search?: string;
}

export interface CreateLocationPayload {
  name: string;
  slug?: string;
  type: InventoryLocationType;
  address?: string;
  phone?: string;
  active?: boolean;
}

export type UpdateLocationPayload = Partial<CreateLocationPayload>;

export const LOCATION_TYPE_LABEL: Record<InventoryLocationType, string> = {
  ECOMMERCE: "Ecommerce",
  SUCURSAL: "Sucursal",
  ALMACEN: "Almacén",
};

export const LOCATION_TYPE_DESCRIPTION: Record<InventoryLocationType, string> =
  {
    ECOMMERCE: "Inventario online — afecta pedidos del ecommerce.",
    SUCURSAL: "Tienda física — afecta ventas POS de la sucursal.",
    ALMACEN: "Depósito interno — útil para abastecer otras ubicaciones.",
  };
