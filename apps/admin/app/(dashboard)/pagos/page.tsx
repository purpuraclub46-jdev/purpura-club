import { PageHeader } from "@/shared/ui/page-header";
import { MercadoPagoPanel } from "@/features/payments/components/mercadopago-panel";
import { YapeReviewPanel } from "@/features/payments/components/yape-review-panel";

export const metadata = { title: "Pagos" };

export default function PagosPage() {
  return (
    <>
      <PageHeader
        title="Pagos"
        description="Yape es manual y exclusivo para tickets de sorteos. MercadoPago es automático y exclusivo para pedidos del ecommerce (joyería, perfumes, accesorios)."
      />

      <YapeReviewPanel />
      <MercadoPagoPanel />
    </>
  );
}
