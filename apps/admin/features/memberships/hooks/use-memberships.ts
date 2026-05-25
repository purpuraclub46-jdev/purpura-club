"use client";

import { useQuery } from "@tanstack/react-query";
import { membershipsApi } from "../api/memberships.api";
import type { BenefitLogQuery, MembershipListQuery } from "../types";

export const membershipsKeys = {
  all: ["memberships"] as const,
  list: (query: MembershipListQuery) =>
    [...membershipsKeys.all, "list", query] as const,
  stats: () => [...membershipsKeys.all, "stats"] as const,
  benefits: (query: BenefitLogQuery) =>
    [...membershipsKeys.all, "benefits", query] as const,
};

export const useMembershipsList = (query: MembershipListQuery = {}) =>
  useQuery({
    queryKey: membershipsKeys.list(query),
    queryFn: () => membershipsApi.list(query),
  });

export const useMembershipsStats = () =>
  useQuery({
    queryKey: membershipsKeys.stats(),
    queryFn: () => membershipsApi.stats(),
  });

export const useBenefitLogs = (query: BenefitLogQuery = {}) =>
  useQuery({
    queryKey: membershipsKeys.benefits(query),
    queryFn: () => membershipsApi.benefits(query),
  });
