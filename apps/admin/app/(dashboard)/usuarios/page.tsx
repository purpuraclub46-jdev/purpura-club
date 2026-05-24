import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata = { title: "Usuarios" };

export default function UsuariosPage() {
  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Gestiona cuentas, roles y permisos."
      />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={ShieldAlert}
            title="API de usuarios aún no disponible"
            description="El backend solo expone endpoints de autenticación. Una API /users dedicada está en la hoja de ruta — esta pantalla se conectará automáticamente cuando esté lista."
          />
        </CardContent>
      </Card>
    </>
  );
}
