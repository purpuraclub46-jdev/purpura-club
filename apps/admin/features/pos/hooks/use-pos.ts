"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { posApi } from "../api/pos.api";
import type {
  CloseSessionPayload,
  CreateMovementPayload,
  CreatePosSalePayload,
  OpenSessionPayload,
} from "../types";

export const posKeys = {
  all: ["pos"] as const,
  bootstrap: () => [...posKeys.all, "bootstrap"] as const,
  location: (slug: string) => [...posKeys.all, "location", slug] as const,
  series: (locationId: string) => [...posKeys.all, "series", locationId] as const,
  reports: (locationId: string) =>
    [...posKeys.all, "reports", locationId] as const,
  registers: (locationId: string) =>
    [...posKeys.all, "registers", locationId] as const,
  activeSession: (locationId: string) =>
    [...posKeys.all, "activeSession", locationId] as const,
  session: (sessionId: string) =>
    [...posKeys.all, "session", sessionId] as const,
  sessions: (locationId: string) =>
    [...posKeys.all, "sessions", locationId] as const,
  recentSales: (locationId: string) =>
    [...posKeys.all, "recentSales", locationId] as const,
};

export const usePosBootstrap = () =>
  useQuery({
    queryKey: posKeys.bootstrap(),
    queryFn: () => posApi.bootstrap(),
  });

export const usePosLocation = (slug: string | undefined) =>
  useQuery({
    queryKey: slug ? posKeys.location(slug) : ["pos", "location", "none"],
    queryFn: () => posApi.resolveLocation(slug as string),
    enabled: Boolean(slug),
  });

export const usePosReports = (locationId: string | undefined) =>
  useQuery({
    queryKey: locationId
      ? posKeys.reports(locationId)
      : ["pos", "reports", "none"],
    queryFn: () => posApi.reports(locationId as string),
    enabled: Boolean(locationId),
    refetchInterval: 60_000,
  });

export const usePosActiveSession = (locationId: string | undefined) =>
  useQuery({
    queryKey: locationId
      ? posKeys.activeSession(locationId)
      : ["pos", "activeSession", "none"],
    queryFn: () => posApi.activeSession(locationId as string),
    enabled: Boolean(locationId),
  });

export const usePosSessions = (locationId: string | undefined) =>
  useQuery({
    queryKey: locationId
      ? posKeys.sessions(locationId)
      : ["pos", "sessions", "none"],
    queryFn: () => posApi.listSessions(locationId as string, 20),
    enabled: Boolean(locationId),
  });

export const usePosRecentSales = (locationId: string | undefined) =>
  useQuery({
    queryKey: locationId
      ? posKeys.recentSales(locationId)
      : ["pos", "recentSales", "none"],
    queryFn: () => posApi.recentSales(locationId as string, 10),
    enabled: Boolean(locationId),
  });

export const useOpenSession = (locationId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OpenSessionPayload) =>
      posApi.openSession(locationId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.all });
    },
  });
};

export const useCloseSession = (sessionId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CloseSessionPayload) =>
      posApi.closeSession(sessionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.all });
    },
  });
};

export const useAddMovement = (sessionId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMovementPayload) =>
      posApi.addMovement(sessionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.all });
    },
  });
};

export const useCreatePosSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePosSalePayload) => posApi.createSale(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.all });
    },
  });
};
