import { Settings } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Preferencias generales del workspace, integraciones y branding."
      />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Settings}
            title="Configuración en construcción"
            description="Próximamente podrás administrar integraciones, ajustes de marca y permisos por rol desde una vista única."
          />
        </CardContent>
      </Card>
    </>
  );
}
