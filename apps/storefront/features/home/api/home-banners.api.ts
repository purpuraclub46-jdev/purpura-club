"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, HomeBannerEntity } from "@/types/api";

export const homeBannersApi = {
  listPublic: async (): Promise<HomeBannerEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<HomeBannerEntity[]>>(
      "/home-banners",
    );
    return unwrap(data);
  },
};
