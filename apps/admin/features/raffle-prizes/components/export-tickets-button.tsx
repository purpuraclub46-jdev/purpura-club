"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { prizesApi } from "../api/prizes.api";

interface Props {
  raffleId: string;
  label?: string;
  variant?: "default" | "outline";
}

export function ExportTicketsButton({
  raffleId,
  label = "Exportar participaciones",
  variant = "outline",
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const { blob, filename } = await prizesApi.exportTicketsXlsx(raffleId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel descargado");
    } catch (error) {
      toast.error("No se pudo exportar", extractErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={() => void handleClick()}
      isLoading={busy}
    >
      <Download className="size-4" /> {label}
    </Button>
  );
}
