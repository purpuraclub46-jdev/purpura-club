"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import { Card, CardContent } from "@/shared/ui/card";
import { useRaffleEntriesList } from "@/features/raffle-entries/hooks/use-raffle-entries";
import { EntriesTable } from "@/features/raffle-entries/components/entries-table";
import type { EntryListQuery } from "@/features/raffle-entries/types";

export default function GanadoresPage() {
  const [query, setQuery] = useState<EntryListQuery>({
    page: 1,
    limit: 20,
    status: "WINNER",
  });
  const { data, isLoading } = useRaffleEntriesList(query);

  return (
    <>
      <PageHeader
        title="Ganadores"
        description="Historial de tickets ganadores de cada sorteo realizado."
      />

      <Card>
        <CardContent className="pt-6">
          <EntriesTable
            data={data?.items ?? []}
            isLoading={isLoading}
            meta={data?.meta}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </CardContent>
      </Card>
    </>
  );
}
