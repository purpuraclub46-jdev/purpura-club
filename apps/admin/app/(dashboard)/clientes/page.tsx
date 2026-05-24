import { UserSquare2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Base de clientes con historial de compras, sorteos y comunicación."
      />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={UserSquare2}
            title="Módulo de clientes en construcción"
            description="Aquí encontrarás el CRM ligero — perfiles, etiquetas, segmentos y actividad. La API de clientes está en la hoja de ruta."
          />
        </CardContent>
      </Card>
    </>
  );
}
