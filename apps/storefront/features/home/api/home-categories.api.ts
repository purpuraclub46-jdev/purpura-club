"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, HomeCategoryEntity } from "@/types/api";

export const homeCategoriesApi = {
  listPublic: async (): Promise<HomeCategoryEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<HomeCategoryEntity[]>>(
      "/home-categories",
    );
    return unwrap(data);
  },
};
