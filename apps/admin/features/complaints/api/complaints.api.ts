import { httpClient, unwrap } from "@/services/http/client";
import type {
  ApiResponse,
  ComplaintEntity,
  ComplaintListQuery,
  Paginated,
  UpdateComplaintPayload,
} from "@/types/api";

export const complaintsApi = {
  listAdmin: async (
    query: ComplaintListQuery = {},
  ): Promise<Paginated<ComplaintEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<ComplaintEntity>>
    >("/complaints/admin", { params: query });
    return unwrap(data);
  },

  getAdmin: async (id: string): Promise<ComplaintEntity> => {
    const { data } = await httpClient.get<ApiResponse<ComplaintEntity>>(
      `/complaints/admin/${id}`,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateComplaintPayload,
  ): Promise<ComplaintEntity> => {
    const { data } = await httpClient.patch<ApiResponse<ComplaintEntity>>(
      `/complaints/admin/${id}`,
      payload,
    );
    return unwrap(data);
  },
};
