"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import { useRaffleEntriesList } from "@/features/raffle-entries/hooks/use-raffle-entries";
import { EntriesFilters } from "@/features/raffle-entries/components/entries-filters";
import { EntriesTable } from "@/features/raffle-entries/components/entries-table";
import type { EntryListQuery } from "@/features/raffle-entries/types";

export default function ParticipacionesPage() {
  const [query, setQuery] = useState<EntryListQuery>({ page: 1, limit: 20 });
  const { data, isLoading } = useRaffleEntriesList(query);

  return (
    <>
      <PageHeader
        title="Participaciones"
        description="Audita todas las participaciones — compras directas, recompensas, referidos y bonos."
      />

      <EntriesFilters value={query} onChange={setQuery} />

      <EntriesTable
        data={data?.items ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}
