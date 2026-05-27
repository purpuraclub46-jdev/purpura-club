"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { complaintsApi } from "../api/complaints.api";
import type {
  ComplaintListQuery,
  UpdateComplaintPayload,
} from "@/types/api";

export const complaintsKeys = {
  all: ["complaints"] as const,
  list: (query: ComplaintListQuery) =>
    [...complaintsKeys.all, "list", query] as const,
  detail: (id: string) => [...complaintsKeys.all, "detail", id] as const,
};

export const useComplaintsList = (query: ComplaintListQuery) =>
  useQuery({
    queryKey: complaintsKeys.list(query),
    queryFn: () => complaintsApi.listAdmin(query),
  });

export const useComplaintDetail = (id: string | undefined) =>
  useQuery({
    queryKey: id ? complaintsKeys.detail(id) : [...complaintsKeys.all, "none"],
    queryFn: () => complaintsApi.getAdmin(id as string),
    enabled: Boolean(id),
  });

export const useUpdateComplaint = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateComplaintPayload) =>
      complaintsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complaintsKeys.all });
    },
  });
};
