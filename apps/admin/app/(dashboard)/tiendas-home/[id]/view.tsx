"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { HomeStoreForm } from "@/features/home-stores/components/home-store-form";
import { useHomeStore } from "@/features/home-stores/hooks/use-home-stores";

export function HomeStoreDetailView({ id }: { id: string }) {
  const { data, isLoading, isError } = useHomeStore(id);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando tienda…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Tienda no encontrada"
        description="Es posible que haya sido eliminada o que el enlace sea incorrecto."
      />
    );
  }

  return (
    <>
      <PageHeader
        title={data.name}
        description={`${data.city} · ${data.address}`}
      />
      <Card>
        <CardContent className="pt-6">
          <HomeStoreForm mode="edit" initial={data} />
        </CardContent>
      </Card>
    </>
  );
}
