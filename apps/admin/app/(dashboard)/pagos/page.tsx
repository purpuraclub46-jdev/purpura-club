import { PageHeader } from "@/shared/ui/page-header";
import { MercadoPagoPanel } from "@/features/payments/components/mercadopago-panel";
import { YapeReviewPanel } from "@/features/payments/components/yape-review-panel";

export const metadata = { title: "Pagos" };

export default function PagosPage() {
  return (
    <>
      <PageHeader
        title="Pagos"
        description="Yape requiere aprobación manual; MercadoPago es automático. Cada proveedor se gestiona desde el mismo panel."
      />

      <YapeReviewPanel />
      <MercadoPagoPanel />
    </>
  );
}
