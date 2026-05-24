"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import { OrdersFilters } from "@/features/orders/components/orders-filters";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { useOrdersList } from "@/features/orders/hooks/use-orders";
import type { OrderListQuery } from "@/features/orders/types";

export default function PedidosPage() {
  const [query, setQuery] = useState<OrderListQuery>({ page: 1, limit: 20 });
  const { data, isLoading } = useOrdersList(query);
  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Pedidos del ecommerce y futuras ventas POS."
      />

      <OrdersFilters value={query} onChange={setQuery} />

      <OrdersTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}
