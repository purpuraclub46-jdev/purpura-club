"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, History } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { AdjustStockDialog } from "@/features/inventory/components/adjust-stock-dialog";
import { InventoryFilters } from "@/features/inventory/components/inventory-filters";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { useStockList } from "@/features/inventory/hooks/use-inventory";
import type {
  StockListQuery,
  StockRow,
} from "@/features/inventory/types";

export default function InventariosPage() {
  const [query, setQuery] = useState<StockListQuery>({
    page: 1,
    limit: 30,
  });

  const [target, setTarget] = useState<StockRow | null>(null);

  const { data, isLoading } = useStockList(query);
  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <>
      <PageHeader
        title="Inventarios"
        description="Stock independiente por ubicación: ecommerce, sucursales y almacenes."
        actions={
          <>
            <Button asChild>
              <Link href="/transferencias/nueva">
                <ArrowRightLeft className="size-4" /> Nueva transferencia
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/movimientos">
                <History className="size-4" /> Movimientos
              </Link>
            </Button>
          </>
        }
      />

      <InventoryFilters value={query} onChange={setQuery} />

      <InventoryTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
        onAdjust={setTarget}
      />

      <AdjustStockDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        row={target}
      />
    </>
  );
}
