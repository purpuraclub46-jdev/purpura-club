export interface BranchEntity {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  productsTracked: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchListQuery {
  page?: number;
  limit?: number;
  active?: boolean;
  search?: string;
}

export interface CreateBranchPayload {
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  active?: boolean;
}

export type UpdateBranchPayload = Partial<CreateBranchPayload>;
