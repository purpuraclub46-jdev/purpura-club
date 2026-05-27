"use client";

import { useQuery } from "@tanstack/react-query";
import { homeCategoriesApi } from "../api/home-categories.api";

export const homeCategoriesKeys = {
  all: ["home-categories"] as const,
  list: () => [...homeCategoriesKeys.all, "list"] as const,
};

export const useHomeCategories = () =>
  useQuery({
    queryKey: homeCategoriesKeys.list(),
    queryFn: () => homeCategoriesApi.listPublic(),
    staleTime: 5 * 60_000,
  });
