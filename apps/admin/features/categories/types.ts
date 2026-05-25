import type { CategoryGroup } from "@/types/api";

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
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListQuery {
  page?: number;
  limit?: number;
  group?: CategoryGroup;
  active?: boolean;
  search?: string;
  parentId?: string;
  rootOnly?: boolean;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  image?: string;
  group: CategoryGroup;
  order?: number;
  active?: boolean;
  parentId?: string | null;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export const CATEGORY_GROUP_LABEL: Record<CategoryGroup, string> = {
  JOYERIA: "Joyería",
  PERFUMES: "Perfumes",
  ACCESORIOS: "Accesorios",
};
