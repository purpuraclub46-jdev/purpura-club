"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { useRafflesList } from "@/features/raffles/hooks/use-raffles";
import { RafflesFilters } from "@/features/raffles/components/raffles-filters";
import { RafflesTable } from "@/features/raffles/components/raffles-table";
import type { RaffleListQuery } from "@/features/raffles/types";

export default function SorteosPage() {
  const [query, setQuery] = useState<RaffleListQuery>({
    page: 1,
    limit: 20,
    timeFilter: "all",
  });

  const { data, isLoading } = useRafflesList(query);

  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <>
      <PageHeader
        title="Sorteos"
        description="Gestiona borradores, publica sorteos y elige ganadores."
        actions={
          <Button asChild>
            <Link href="/sorteos/nuevo">
              <Plus className="size-4" /> Nuevo sorteo
            </Link>
          </Button>
        }
      />

      <RafflesFilters value={query} onChange={setQuery} />

      <RafflesTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}
