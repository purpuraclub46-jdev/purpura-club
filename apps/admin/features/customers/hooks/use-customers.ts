"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "../api/customers.api";
import type {
  CreateCustomerPayload,
  CustomerListQuery,
  CustomerSearchQuery,
  UpdateCustomerPayload,
} from "../types";

export const customersKeys = {
  all: ["customers"] as const,
  list: (query: CustomerListQuery) =>
    [...customersKeys.all, "list", query] as const,
  overview: () => [...customersKeys.all, "overview"] as const,
  detail: (id: string) => [...customersKeys.all, "detail", id] as const,
  search: (query: CustomerSearchQuery) =>
    [...customersKeys.all, "search", query] as const,
};

export const useCustomersList = (query: CustomerListQuery = {}) =>
  useQuery({
    queryKey: customersKeys.list(query),
    queryFn: () => customersApi.list(query),
  });

export const useCustomersOverview = () =>
  useQuery({
    queryKey: customersKeys.overview(),
    queryFn: () => customersApi.overview(),
  });

export const useCustomer = (id: string | undefined) =>
  useQuery({
    queryKey: id
      ? customersKeys.detail(id)
      : ["customers", "detail", "none"],
    queryFn: () => customersApi.getById(id as string),
    enabled: Boolean(id),
  });

export const useCustomerSearch = (
  query: CustomerSearchQuery,
  enabled: boolean,
) =>
  useQuery({
    queryKey: customersKeys.search(query),
    queryFn: () => customersApi.search(query),
    enabled,
  });

/**
 * Lookup fiscal por número exacto de documento (DNI o RUC). Devuelve `null`
 * si no existe — útil para el checkout POS / web cuando el cajero/cliente
 * tipea el documento.
 */
export const useCustomerLookup = (
  documentNumber: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: [...customersKeys.all, "lookup", documentNumber] as const,
    queryFn: () => customersApi.lookupByDocument(documentNumber),
    enabled,
    staleTime: 30_000,
  });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) =>
      customersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKeys.all }),
  });
};

export const useUpdateCustomer = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCustomerPayload) =>
      customersApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKeys.all }),
  });
};

export const useSetCustomerActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      customersApi.setActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKeys.all }),
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKeys.all }),
  });
};
