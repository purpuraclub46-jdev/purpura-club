import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { RaffleForm } from "@/features/raffles/components/raffle-form";

export const metadata = { title: "Nuevo sorteo" };

export default function NuevoSorteoPage() {
  return (
    <>
      <PageHeader
        title="Nuevo sorteo"
        description="Registra los datos del sorteo. Podrás publicarlo desde el detalle."
      />
      <Card>
        <CardContent className="pt-6">
          <RaffleForm mode="create" />
        </CardContent>
      </Card>
    </>
  );
}
