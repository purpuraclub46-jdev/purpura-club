"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type {
  ApiResponse,
  ComplaintEntity,
  CreateComplaintPayload,
} from "@/types/api";

export const complaintsApi = {
  create: async (
    payload: CreateComplaintPayload,
  ): Promise<ComplaintEntity> => {
    const { data } = await httpClient.post<ApiResponse<ComplaintEntity>>(
      "/complaints",
      payload,
    );
    return unwrap(data);
  },
};
