"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, History } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { AdjustStockDialog } from "@/features/inventory/components/adjust-stock-dialog";
import { InventoryFilters } from "@/features/inventory/components/inventory-filters";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { TransferStockDialog } from "@/features/inventory/components/transfer-stock-dialog";
import { useInventoryList } from "@/features/inventory/hooks/use-inventory";
import type {
  InventoryListQuery,
  InventoryRow,
} from "@/features/inventory/types";

export default function InventarioPage() {
  const [query, setQuery] = useState<InventoryListQuery>({
    page: 1,
    limit: 30,
  });

  const [target, setTarget] = useState<InventoryRow | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data, isLoading } = useInventoryList(query);
  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Stock por sucursal en tiempo real."
        actions={
          <>
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="size-4" /> Transferir
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

      <TransferStockDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </>
  );
}
