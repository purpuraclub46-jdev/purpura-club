import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type { ReferralEntity, ReferralListQuery } from "../types";

export const referralsApi = {
  list: async (
    query: ReferralListQuery = {},
  ): Promise<Paginated<ReferralEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<ReferralEntity>>
    >("/referrals/admin/all", { params: query });
    return unwrap(data);
  },
};
