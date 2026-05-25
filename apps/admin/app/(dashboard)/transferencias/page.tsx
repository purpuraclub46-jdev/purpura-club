"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { useLocationsList } from "@/features/locations/hooks/use-locations";
import { LOCATION_TYPE_LABEL } from "@/features/locations/types";
import { TransfersTable } from "@/features/transfers/components/transfers-table";
import { useTransfersList } from "@/features/transfers/hooks/use-transfers";
import {
  TRANSFER_STATUS_LABEL,
  type TransferListQuery,
} from "@/features/transfers/types";
import type { InventoryTransferStatus } from "@/types/api";

const STATUSES: InventoryTransferStatus[] = [
  "PENDING",
  "COMPLETED",
  "CANCELLED",
];

export default function TransferenciasPage() {
  const [query, setQuery] = useState<TransferListQuery>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading } = useTransfersList(query);
  const { data: locsData } = useLocationsList({ page: 1, limit: 100 });
  const locations = locsData?.items ?? [];

  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <>
      <PageHeader
        title="Transferencias de inventario"
        description="Mueve stock entre ecommerce, sucursales y almacenes."
        actions={
          <Button asChild>
            <Link href="/transferencias/nueva">
              <Plus className="size-4" /> Nueva transferencia
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número…"
            className="pl-9"
            value={query.search ?? ""}
            onChange={(e) =>
              setQuery({ ...query, search: e.target.value, page: 1 })
            }
          />
        </div>

        <Select
          value={query.status ?? "ALL"}
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              status: v === "ALL" ? undefined : (v as InventoryTransferStatus),
            })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TRANSFER_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.fromLocationId ?? "ALL"}
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              fromLocationId: v === "ALL" ? undefined : v,
            })
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Desde" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Cualquier origen</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} · {LOCATION_TYPE_LABEL[l.type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.toLocationId ?? "ALL"}
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              toLocationId: v === "ALL" ? undefined : v,
            })
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Hacia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Cualquier destino</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} · {LOCATION_TYPE_LABEL[l.type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TransfersTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}
