import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { ComplaintsManager } from "@/features/complaints/components/complaints-manager";

export const metadata = { title: "Libro de Reclamaciones" };

export default function ComplaintsPage() {
  return (
    <>
      <PageHeader
        title="Libro de Reclamaciones"
        description="Reclamos y quejas presentados en el storefront. Conforme a INDECOPI debes responder dentro de los 30 días calendario."
      />
      <Card>
        <CardContent className="pt-6">
          <ComplaintsManager />
        </CardContent>
      </Card>
    </>
  );
}
