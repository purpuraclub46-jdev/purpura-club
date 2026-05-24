"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { BranchDialog } from "@/features/branches/components/branch-form";
import { BranchesTable } from "@/features/branches/components/branches-table";
import { useBranchesList } from "@/features/branches/hooks/use-branches";
import type {
  BranchEntity,
  BranchListQuery,
} from "@/features/branches/types";

export default function SucursalesPage() {
  const [query, setQuery] = useState<BranchListQuery>({ page: 1, limit: 30 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BranchEntity | null>(null);

  const { data, isLoading } = useBranchesList(query);
  const items = useMemo(() => data?.items ?? [], [data]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (branch: BranchEntity) => {
    setEditing(branch);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Sucursales"
        description="Tiendas físicas y puntos de venta de Púrpura Club."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nueva sucursal
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar sucursal…"
            className="pl-9"
            value={query.search ?? ""}
            onChange={(e) =>
              setQuery({ ...query, search: e.target.value, page: 1 })
            }
          />
        </div>
        <Select
          value={
            query.active === undefined
              ? "ALL"
              : query.active
                ? "true"
                : "false"
          }
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              active: v === "ALL" ? undefined : v === "true",
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="true">Activas</SelectItem>
            <SelectItem value="false">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BranchesTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
        onEdit={openEdit}
      />

      <BranchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
    </>
  );
}
