"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { ProductsFilters } from "@/features/products/components/products-filters";
import { ProductsTable } from "@/features/products/components/products-table";
import { useProductsList } from "@/features/products/hooks/use-products";
import type { ProductListQuery } from "@/features/products/types";

export default function ProductosPage() {
  const [query, setQuery] = useState<ProductListQuery>({
    page: 1,
    limit: 20,
    sort: "createdAt:desc",
  });

  const { data, isLoading } = useProductsList(query);
  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <>
      <PageHeader
        title="Productos"
        description="Gestiona el catálogo de joyería, perfumes y accesorios."
        actions={
          <Button asChild>
            <Link href="/productos/nuevo">
              <Plus className="size-4" /> Nuevo producto
            </Link>
          </Button>
        }
      />

      <ProductsFilters value={query} onChange={setQuery} />

      <ProductsTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}
