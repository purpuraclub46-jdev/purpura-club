"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { BenefitsTable } from "@/features/memberships/components/benefits-table";
import { useBenefitLogs } from "@/features/memberships/hooks/use-memberships";
import {
  BENEFIT_TYPE_LABEL,
  type BenefitLogQuery,
} from "@/features/memberships/types";
import type { MembershipBenefitType } from "@/types/api";

const TYPES: MembershipBenefitType[] = [
  "DISCOUNT",
  "RAFFLE_ENTRY",
  "REFERRAL_BONUS",
];

export default function BeneficiosPage() {
  const [query, setQuery] = useState<BenefitLogQuery>({
    page: 1,
    limit: 30,
  });

  const { data, isLoading } = useBenefitLogs(query);

  return (
    <>
      <PageHeader
        title="Beneficios"
        description="Historial completo de beneficios otorgados a miembros Púrpura Club: descuentos, participaciones automáticas y bonos por referidos."
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email del miembro…"
            className="pl-9"
            value={query.search ?? ""}
            onChange={(e) =>
              setQuery({ ...query, page: 1, search: e.target.value })
            }
          />
        </div>
        <Select
          value={query.type ?? "ALL"}
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              type: v === "ALL" ? undefined : (v as MembershipBenefitType),
            })
          }
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los beneficios</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {BENEFIT_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BenefitsTable
        data={data?.items ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}
