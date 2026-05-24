import { Badge } from "@/shared/ui/badge";
import type {
  EntryStatus,
  EntryType,
  PaymentMethod,
} from "@/types/api";

const statusMap: Record<
  EntryStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  PENDING_PAYMENT: { label: "Pago pendiente", variant: "warning" },
  PAID: { label: "Pagada", variant: "success" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
  WINNER: { label: "Ganadora", variant: "default" },
};

const typeMap: Record<
  EntryType,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  DIRECT_PURCHASE: { label: "Compra directa", variant: "default" },
  PURCHASE_REWARD: { label: "Recompensa", variant: "outline" },
  REFERRAL: { label: "Referido", variant: "outline" },
  BONUS: { label: "Bono", variant: "outline" },
};

const methodMap: Record<
  PaymentMethod,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  YAPE: { label: "Yape", variant: "default" },
  FREE: { label: "Gratis", variant: "outline" },
  MERCADOPAGO: { label: "MercadoPago", variant: "default" },
};

export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  const meta = statusMap[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function EntryTypeBadge({ type }: { type: EntryType }) {
  const meta = typeMap[type];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function PaymentMethodBadge({
  method,
}: {
  method: PaymentMethod | null;
}) {
  if (!method) {
    return (
      <Badge variant="muted" className="text-xs">
        —
      </Badge>
    );
  }
  const meta = methodMap[method];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
