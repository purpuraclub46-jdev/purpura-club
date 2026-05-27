"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { HomeStoresTable } from "@/features/home-stores/components/home-stores-table";
import { useHomeStoresList } from "@/features/home-stores/hooks/use-home-stores";

export default function HomeStoresPage() {
  const { data, isLoading } = useHomeStoresList();
  const items = data ?? [];

  return (
    <>
      <PageHeader
        title="Tiendas del home"
        description="CRUD ilimitado de boutiques físicas que aparecen en el carrusel del storefront. Cada tienda admite imagen desktop/mobile, horario, WhatsApp y link a Google Maps."
        actions={
          <Button asChild>
            <Link href="/tiendas-home/nueva">
              <Plus className="size-4" /> Nueva tienda
            </Link>
          </Button>
        }
      />
      <HomeStoresTable data={items} isLoading={isLoading} />
    </>
  );
}
