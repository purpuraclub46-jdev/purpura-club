import { Users } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata = { title: "Referidos" };

export default function ReferidosPage() {
  return (
    <>
      <PageHeader
        title="Referidos"
        description="Programa de referidos — invitaciones, conversiones y recompensas."
      />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Users}
            title="Programa de referidos en preparación"
            description="Configurarás reglas de recompensa, generarás códigos únicos y verás el árbol de referidos en esta pantalla."
          />
        </CardContent>
      </Card>
    </>
  );
}
