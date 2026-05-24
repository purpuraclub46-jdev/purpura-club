import { Gift } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata = { title: "Memberships" };

export default function MembresiasPage() {
  return (
    <>
      <PageHeader
        title="Memberships"
        description="Planes de membresía Púrpura Club, beneficios y suscriptores activos."
      />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Gift}
            title="Memberships en construcción"
            description="Diseña planes, gestiona beneficios y monitorea el ciclo de vida de cada suscripción una vez que la API esté lista."
          />
        </CardContent>
      </Card>
    </>
  );
}
