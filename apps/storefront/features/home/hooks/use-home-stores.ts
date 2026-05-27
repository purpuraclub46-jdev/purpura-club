"use client";

import { useQuery } from "@tanstack/react-query";
import { homeStoresApi } from "../api/home-stores.api";

export const homeStoresKeys = {
  all: ["home-stores"] as const,
  list: () => [...homeStoresKeys.all, "list"] as const,
};

export const useHomeStores = () =>
  useQuery({
    queryKey: homeStoresKeys.list(),
    queryFn: () => homeStoresApi.listPublic(),
    staleTime: 5 * 60_000,
  });
