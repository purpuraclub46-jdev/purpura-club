import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { HomeStoreForm } from "@/features/home-stores/components/home-store-form";

export const metadata = { title: "Nueva tienda" };

export default function NuevaTiendaPage() {
  return (
    <>
      <PageHeader
        title="Nueva tienda"
        description="Configura una boutique nueva. Aparecerá en el carrusel del home apenas la marques como visible."
      />
      <Card>
        <CardContent className="pt-6">
          <HomeStoreForm mode="create" />
        </CardContent>
      </Card>
    </>
  );
}
