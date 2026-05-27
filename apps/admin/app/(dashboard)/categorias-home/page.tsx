import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { HomeCategoriesManager } from "@/features/home-categories/components/home-categories-manager";

export const metadata = { title: "Subcategorías del home" };

export default function HomeCategoriesPage() {
  return (
    <>
      <PageHeader
        title="Subcategorías del home"
        description="6 cards fijas del carrusel editorial: Perfumes hombre/mujer y Joyas (acero dorado, acero plateado, bañadas en oro, plata). Cada slot admite imagen desktop y mobile separadas, overlay configurable y se puede ocultar sin perder la configuración."
      />
      <Card>
        <CardContent className="pt-6">
          <HomeCategoriesManager />
        </CardContent>
      </Card>
    </>
  );
}
