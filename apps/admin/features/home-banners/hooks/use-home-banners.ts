"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeBannersApi } from "../api/home-banners.api";
import type { HomeBannerSlot, UpdateHomeBannerPayload } from "../types";

export const homeBannersKeys = {
  all: ["home-banners"] as const,
  list: () => [...homeBannersKeys.all, "list"] as const,
  detail: (slot: HomeBannerSlot) =>
    [...homeBannersKeys.all, "detail", slot] as const,
};

export const useHomeBannersList = () =>
  useQuery({
    queryKey: homeBannersKeys.list(),
    queryFn: () => homeBannersApi.listAdmin(),
  });

export const useUpdateHomeBanner = (slot: HomeBannerSlot) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateHomeBannerPayload) =>
      homeBannersApi.update(slot, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: homeBannersKeys.all });
    },
  });
};
