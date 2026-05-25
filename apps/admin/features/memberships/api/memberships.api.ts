import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  BenefitLogQuery,
  MembershipBenefitLogEntity,
  MembershipEntity,
  MembershipListQuery,
  MembershipStats,
} from "../types";

export const membershipsApi = {
  list: async (
    query: MembershipListQuery = {},
  ): Promise<Paginated<MembershipEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<MembershipEntity>>
    >("/memberships/admin/all", { params: query });
    return unwrap(data);
  },

  stats: async (): Promise<MembershipStats> => {
    const { data } = await httpClient.get<ApiResponse<MembershipStats>>(
      "/memberships/admin/stats",
    );
    return unwrap(data);
  },

  benefits: async (
    query: BenefitLogQuery = {},
  ): Promise<Paginated<MembershipBenefitLogEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<MembershipBenefitLogEntity>>
    >("/memberships/admin/benefits", { params: query });
    return unwrap(data);
  },
};
