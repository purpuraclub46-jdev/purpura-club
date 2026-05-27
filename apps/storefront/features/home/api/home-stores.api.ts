"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, HomeStoreEntity } from "@/types/api";

export const homeStoresApi = {
  listPublic: async (): Promise<HomeStoreEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<HomeStoreEntity[]>>(
      "/home-stores",
    );
    return unwrap(data);
  },
};
