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
import { ReferralsTable } from "@/features/referrals/components/referrals-table";
import { useReferralsList } from "@/features/referrals/hooks/use-referrals";
import type { ReferralListQuery } from "@/features/referrals/types";

export default function ReferidosPage() {
  const [query, setQuery] = useState<ReferralListQuery>({
    page: 1,
    limit: 30,
  });

  const { data, isLoading } = useReferralsList(query);

  return (
    <>
      <PageHeader
        title="Referidos"
        description="Cada usuario referido que realice su primera compra elegible (S/25+) otorga una participación BONUS al referente."
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email o nombre…"
            className="pl-9"
            value={query.search ?? ""}
            onChange={(e) =>
              setQuery({ ...query, page: 1, search: e.target.value })
            }
          />
        </div>
        <Select
          value={
            query.rewarded === undefined
              ? "ALL"
              : query.rewarded
                ? "true"
                : "false"
          }
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              rewarded: v === "ALL" ? undefined : v === "true",
            })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="true">Recompensados</SelectItem>
            <SelectItem value="false">Pendientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ReferralsTable
        data={data?.items ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}
