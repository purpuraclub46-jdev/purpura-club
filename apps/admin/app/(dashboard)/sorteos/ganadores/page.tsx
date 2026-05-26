"use client";

import { PageHeader } from "@/shared/ui/page-header";
import { WinnersList } from "@/features/raffle-prizes/components/winners-list";

export default function GanadoresPage() {
  return (
    <>
      <PageHeader
        title="Ganadores oficiales"
        description="Premios publicados con foto, video y comunicado de entrega. Esta vista alimentará la landing pública y el panel de cada usuario."
      />
      <WinnersList />
    </>
  );
}
