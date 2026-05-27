import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse } from "@/types/api";
import type {
  HomeBannerEntity,
  HomeBannerSlot,
  UpdateHomeBannerPayload,
} from "../types";

export const homeBannersApi = {
  listAdmin: async (): Promise<HomeBannerEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<HomeBannerEntity[]>>(
      "/home-banners/admin/all",
    );
    return unwrap(data);
  },

  getAdmin: async (slot: HomeBannerSlot): Promise<HomeBannerEntity> => {
    const { data } = await httpClient.get<ApiResponse<HomeBannerEntity>>(
      `/home-banners/admin/${slot}`,
    );
    return unwrap(data);
  },

  update: async (
    slot: HomeBannerSlot,
    payload: UpdateHomeBannerPayload,
  ): Promise<HomeBannerEntity> => {
    const { data } = await httpClient.patch<ApiResponse<HomeBannerEntity>>(
      `/home-banners/${slot}`,
      payload,
    );
    return unwrap(data);
  },
};
