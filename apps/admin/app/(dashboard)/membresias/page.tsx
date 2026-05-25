"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { MembershipsTable } from "@/features/memberships/components/memberships-table";
import {
  useMembershipsList,
  useMembershipsStats,
} from "@/features/memberships/hooks/use-memberships";
import type { MembershipListQuery } from "@/features/memberships/types";

export default function MembresiasPage() {
  const [query, setQuery] = useState<MembershipListQuery>({
    page: 1,
    limit: 30,
  });

  const { data: stats } = useMembershipsStats();
  const { data, isLoading } = useMembershipsList(query);

  return (
    <>
      <PageHeader
        title="Membresías"
        description="Cada compra mayor a S/25 activa o renueva la membresía Púrpura Club por 30 días."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Miembros activos"
          value={stats?.activeMembers ?? "—"}
        />
        <StatCard
          label="Por vencer (7 días)"
          value={stats?.expiringSoon ?? "—"}
          tone="warning"
        />
        <StatCard
          label="Expiradas"
          value={stats?.expiredMembers ?? "—"}
          tone="muted"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email…"
            className="pl-9"
            value={query.search ?? ""}
            onChange={(e) =>
              setQuery({ ...query, page: 1, search: e.target.value })
            }
          />
        </div>
        <Select
          value={
            query.active === undefined ? "ALL" : query.active ? "true" : "false"
          }
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              active: v === "ALL" ? undefined : v === "true",
            })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="true">Activas</SelectItem>
            <SelectItem value="false">Expiradas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MembershipsTable
        data={data?.items ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "warning" | "muted";
}) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={
            tone === "warning"
              ? "text-3xl font-semibold text-amber-500 tabular-nums"
              : tone === "muted"
                ? "text-3xl font-semibold text-muted-foreground tabular-nums"
                : "text-3xl font-semibold text-primary tabular-nums"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
