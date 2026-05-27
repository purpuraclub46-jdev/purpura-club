"use client";

import { useQuery } from "@tanstack/react-query";
import { homeBannersApi } from "../api/home-banners.api";

export const homeBannersKeys = {
  all: ["home-banners"] as const,
  list: () => [...homeBannersKeys.all, "list"] as const,
};

export const useHomeBanners = () =>
  useQuery({
    queryKey: homeBannersKeys.list(),
    queryFn: () => homeBannersApi.listPublic(),
    staleTime: 5 * 60_000,
  });
