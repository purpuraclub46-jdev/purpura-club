import { FileText } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata = { title: "SUNAT" };

export default function SunatPage() {
  return (
    <>
      <PageHeader
        title="SUNAT"
        description="Facturación electrónica, boletas, notas y reportes para SUNAT."
      />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={FileText}
            title="Integración SUNAT pendiente"
            description="Aquí podrás emitir comprobantes electrónicos, consultar estados y descargar XML/PDF cuando la integración esté activa."
          />
        </CardContent>
      </Card>
    </>
  );
}
