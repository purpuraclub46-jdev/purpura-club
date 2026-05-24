"use client";

import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { OrderPaymentMethod, OrderStatus } from "@/types/api";
import {
  ORDER_PAYMENT_LABEL,
  ORDER_STATUS_LABEL,
  type OrderListQuery,
} from "../types";

interface Props {
  value: OrderListQuery;
  onChange: (next: OrderListQuery) => void;
}

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "CANCELLED", "REFUNDED"];
const METHODS: OrderPaymentMethod[] = ["MERCADOPAGO", "YAPE", "CASH", "CARD"];

export function OrdersFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por número o email…"
          className="pl-9"
          value={value.search ?? ""}
          onChange={(e) =>
            onChange({ ...value, search: e.target.value, page: 1 })
          }
        />
      </div>

      <Select
        value={value.status ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            status: v === "ALL" ? undefined : (v as OrderStatus),
          })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los estados</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.paymentMethod ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            paymentMethod: v === "ALL" ? undefined : (v as OrderPaymentMethod),
          })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Pago" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Cualquier método</SelectItem>
          {METHODS.map((m) => (
            <SelectItem key={m} value={m}>
              {ORDER_PAYMENT_LABEL[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
