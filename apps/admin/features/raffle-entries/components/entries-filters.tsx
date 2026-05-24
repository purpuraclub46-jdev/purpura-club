"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { EntryListQuery } from "@/features/raffle-entries/types";

interface EntriesFiltersProps {
  value: EntryListQuery;
  onChange: (next: EntryListQuery) => void;
}

export function EntriesFilters({ value, onChange }: EntriesFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.status ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            status:
              v === "ALL" ? undefined : (v as EntryListQuery["status"]),
          })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los estados</SelectItem>
          <SelectItem value="PENDING_PAYMENT">Pago pendiente</SelectItem>
          <SelectItem value="PAID">Pagadas</SelectItem>
          <SelectItem value="WINNER">Ganadoras</SelectItem>
          <SelectItem value="CANCELLED">Canceladas</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.type ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            type: v === "ALL" ? undefined : (v as EntryListQuery["type"]),
          })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Origen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Cualquier origen</SelectItem>
          <SelectItem value="DIRECT_PURCHASE">Compra directa</SelectItem>
          <SelectItem value="PURCHASE_REWARD">Recompensa</SelectItem>
          <SelectItem value="REFERRAL">Referido</SelectItem>
          <SelectItem value="BONUS">Bono</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.paymentMethod ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            paymentMethod:
              v === "ALL"
                ? undefined
                : (v as EntryListQuery["paymentMethod"]),
          })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Método" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Cualquier método</SelectItem>
          <SelectItem value="YAPE">Yape</SelectItem>
          <SelectItem value="MERCADOPAGO">MercadoPago</SelectItem>
          <SelectItem value="FREE">Gratis</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
