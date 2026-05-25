"use client";

import { useQuery } from "@tanstack/react-query";
import { referralsApi } from "../api/referrals.api";
import type { ReferralListQuery } from "../types";

export const referralsKeys = {
  all: ["referrals"] as const,
  list: (query: ReferralListQuery) =>
    [...referralsKeys.all, "list", query] as const,
};

export const useReferralsList = (query: ReferralListQuery = {}) =>
  useQuery({
    queryKey: referralsKeys.list(query),
    queryFn: () => referralsApi.list(query),
  });
