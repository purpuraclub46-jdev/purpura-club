import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata = { title: "Reportes" };

export default function ReportesPage() {
  return (
    <>
      <PageHeader
        title="Reportes"
        description="Reportes operativos, comerciales y financieros."
      />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={BarChart3}
            title="Reportes en construcción"
            description="Consulta y exporta reportes consolidados de ventas, sorteos, membresías y pagos en cuanto estén disponibles."
          />
        </CardContent>
      </Card>
    </>
  );
}
