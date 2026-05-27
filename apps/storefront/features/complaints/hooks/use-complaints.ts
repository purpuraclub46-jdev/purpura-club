"use client";

import { useMutation } from "@tanstack/react-query";
import { complaintsApi } from "../api/complaints.api";
import type { CreateComplaintPayload } from "@/types/api";

export const useSubmitComplaint = () =>
  useMutation({
    mutationFn: (payload: CreateComplaintPayload) =>
      complaintsApi.create(payload),
  });
