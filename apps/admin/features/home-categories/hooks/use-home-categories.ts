"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeCategoriesApi } from "../api/home-categories.api";
import type { HomeCategorySlot, UpdateHomeCategoryPayload } from "../types";

export const homeCategoriesKeys = {
  all: ["home-categories"] as const,
  list: () => [...homeCategoriesKeys.all, "list"] as const,
  detail: (slot: HomeCategorySlot) =>
    [...homeCategoriesKeys.all, "detail", slot] as const,
};

export const useHomeCategoriesList = () =>
  useQuery({
    queryKey: homeCategoriesKeys.list(),
    queryFn: () => homeCategoriesApi.listAdmin(),
  });

export const useUpdateHomeCategory = (slot: HomeCategorySlot) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateHomeCategoryPayload) =>
      homeCategoriesApi.update(slot, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: homeCategoriesKeys.all });
    },
  });
};
