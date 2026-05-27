"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi, type ProductListQuery } from "../api/catalog.api";

export const catalogKeys = {
  all: ["catalog"] as const,
  products: (q: ProductListQuery) =>
    [...catalogKeys.all, "products", q] as const,
  product: (slug: string) => [...catalogKeys.all, "product", slug] as const,
  categories: () => [...catalogKeys.all, "categories"] as const,
  stores: () => [...catalogKeys.all, "stores"] as const,
};

export const useProducts = (query: ProductListQuery = {}) =>
  useQuery({
    queryKey: catalogKeys.products(query),
    queryFn: () => catalogApi.listProducts(query),
  });

export const useProductBySlug = (slug: string | undefined) =>
  useQuery({
    queryKey: slug ? catalogKeys.product(slug) : ["catalog", "product", "none"],
    queryFn: () => catalogApi.productBySlug(slug as string),
    enabled: Boolean(slug),
  });

export const useCategories = () =>
  useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: () => catalogApi.listCategories(),
    staleTime: 5 * 60_000,
  });

export const usePublicStores = () =>
  useQuery({
    queryKey: catalogKeys.stores(),
    queryFn: () => catalogApi.listPublicStores(),
    staleTime: 5 * 60_000,
  });
