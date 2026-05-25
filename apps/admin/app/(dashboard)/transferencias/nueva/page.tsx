"use client";

import { PageHeader } from "@/shared/ui/page-header";
import { TransferForm } from "@/features/transfers/components/transfer-form";

export default function NuevaTransferenciaPage() {
  return (
    <>
      <PageHeader
        title="Nueva transferencia"
        description="Mueve stock entre dos ubicaciones de inventario."
      />
      <TransferForm />
    </>
  );
}
