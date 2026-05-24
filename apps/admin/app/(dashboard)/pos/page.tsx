import { ScanLine } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata = { title: "POS" };

export default function PosPage() {
  return (
    <>
      <PageHeader
        title="POS"
        description="Punto de venta físico — operación en tienda y caja."
      />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={ScanLine}
            title="POS en preparación"
            description="Próximamente podrás registrar ventas físicas, abrir/cerrar caja y emitir comprobantes desde esta pantalla."
          />
        </CardContent>
      </Card>
    </>
  );
}
