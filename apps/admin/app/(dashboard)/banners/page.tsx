import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { BannersManager } from "@/features/home-banners/components/banners-manager";

export const metadata = { title: "Banners del home" };

export default function HomeBannersPage() {
  return (
    <>
      <PageHeader
        title="Banners del home"
        description="4 slots fijos: Joyas, Perfumes, Sorteos y un banner flexible opcional. Cada uno admite imágenes desktop y mobile separadas para una experiencia premium en cada viewport."
      />
      <Card>
        <CardContent className="pt-6">
          <BannersManager />
        </CardContent>
      </Card>
    </>
  );
}
