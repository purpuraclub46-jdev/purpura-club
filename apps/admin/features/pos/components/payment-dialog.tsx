"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  ScrollText,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import type { CustomerEntity } from "@/features/customers/types";
import type {
  CustomerDocumentType,
  OrderPaymentMethod,
  ReceiptSeriesType,
} from "@/types/api";
import { DOCUMENT_TYPE_LABEL, RECEIPT_TYPE_LABEL } from "@/types/api";
import type {
  PosSaleCustomerFiscalPayload,
  PosSalePaymentPayload,
} from "../types";
import { PAYMENT_METHOD_LABEL } from "../types";

interface FiscalConfirmPayload {
  payments: PosSalePaymentPayload[];
  receiptType: ReceiptSeriesType;
  customerFiscal?: PosSaleCustomerFiscalPayload;
}

interface Props {
  open: boolean;
  total: number;
  subtotalUntaxed: number;
  igvAmount: number;
  igvRate: number;
  customer: CustomerEntity | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: FiscalConfirmPayload) => void;
}

interface Draft {
  id: string;
  method: OrderPaymentMethod;
  amount: string;
  reference: string;
}

const METHOD_OPTIONS: Array<{
  value: OrderPaymentMethod;
  icon: typeof Banknote;
}> = [
  { value: "CASH", icon: Banknote },
  { value: "YAPE", icon: Smartphone },
  { value: "CARD", icon: CreditCard },
  { value: "MERCADOPAGO", icon: Wallet },
];

const newDraft = (
  method: OrderPaymentMethod,
  amount: number = 0,
): Draft => ({
  id: Math.random().toString(36).slice(2, 10),
  method,
  amount: amount > 0 ? amount.toFixed(2) : "",
  reference: "",
});

const EPSILON = 0.005;

// Inline RUC validator (mirror del backend — check digit módulo 11).
const RUC_FACTORS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
function validateRuc(value: string): string | null {
  if (!/^\d{11}$/.test(value)) {
    return "RUC debe tener 11 dígitos numéricos";
  }
  const prefix = value.substring(0, 2);
  if (!["10", "15", "17", "20"].includes(prefix)) {
    return `RUC debe iniciar con 10, 15, 17 o 20 (recibido: ${prefix})`;
  }
  const digits = value.split("").map((c) => Number(c));
  const expected = digits[10];
  let sum = 0;
  for (let i = 0; i < 10; i += 1) sum += digits[i] * RUC_FACTORS[i];
  const mod = sum % 11;
  const computed = 11 - mod;
  const checkDigit = computed === 10 ? 0 : computed === 11 ? 1 : computed;
  if (checkDigit !== expected) {
    return "RUC tiene dígito de verificación inválido";
  }
  return null;
}

function validateDni(value: string): string | null {
  if (!/^\d{8}$/.test(value)) return "DNI debe tener 8 dígitos";
  return null;
}

export function PaymentDialog({
  open,
  total,
  subtotalUntaxed,
  igvAmount,
  igvRate,
  customer,
  isLoading,
  onOpenChange,
  onConfirm,
}: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fiscal state
  const [receiptType, setReceiptType] = useState<"BOLETA" | "FACTURA">(
    "BOLETA",
  );
  const [docType, setDocType] = useState<CustomerDocumentType>("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [legalName, setLegalName] = useState("");
  const [fiscalAddress, setFiscalAddress] = useState("");
  const [email, setEmail] = useState("");
  const [fiscalError, setFiscalError] = useState<string | null>(null);

  // Sincroniza con el customer cuando abre el diálogo
  useEffect(() => {
    if (!open) return;
    setDrafts([newDraft("CASH", total)]);
    setError(null);
    setFiscalError(null);

    if (customer) {
      // Si el cliente ya tiene RUC, sugerimos factura por default
      const suggestFactura = Boolean(customer.ruc && customer.legalName);
      setReceiptType(suggestFactura ? "FACTURA" : "BOLETA");
      setDocType(
        suggestFactura
          ? "RUC"
          : (customer.documentType ?? "DNI") as CustomerDocumentType,
      );
      setDocNumber(
        suggestFactura ? customer.ruc ?? "" : customer.dni ?? "",
      );
      setLegalName(customer.legalName ?? customer.fullName ?? "");
      setFiscalAddress(customer.fiscalAddress ?? "");
      setEmail(customer.email ?? "");
    } else {
      setReceiptType("BOLETA");
      setDocType("DNI");
      setDocNumber("");
      setLegalName("");
      setFiscalAddress("");
      setEmail("");
    }
  }, [open, total, customer]);

  // Al cambiar a FACTURA, fuerza docType=RUC
  useEffect(() => {
    if (receiptType === "FACTURA" && docType !== "RUC") {
      setDocType("RUC");
      // Re-pre-fill con RUC del customer si lo tiene
      if (customer?.ruc) {
        setDocNumber(customer.ruc);
        if (!legalName) setLegalName(customer.legalName ?? customer.fullName ?? "");
        if (!fiscalAddress) setFiscalAddress(customer.fiscalAddress ?? "");
      }
    }
  }, [receiptType, docType, customer, legalName, fiscalAddress]);

  const paid = drafts.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const remaining = Math.max(0, total - paid);
  const overflow = Math.max(0, paid - total);
  const isExact = Math.abs(paid - total) < EPSILON;

  const update = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const remove = (id: string) =>
    setDrafts((prev) => prev.filter((d) => d.id !== id));

  const addLine = () => {
    setDrafts((prev) => {
      const used = new Set(prev.map((d) => d.method));
      const nextMethod =
        METHOD_OPTIONS.find((m) => !used.has(m.value))?.value ?? "CASH";
      return [...prev, newDraft(nextMethod, remaining)];
    });
  };

  const validateFiscal = (): string | null => {
    if (receiptType === "FACTURA") {
      if (!docNumber.trim()) return "Para emitir FACTURA debes ingresar el RUC del cliente";
      const rucErr = validateRuc(docNumber.trim());
      if (rucErr) return rucErr;
      if (!legalName.trim()) return "Para emitir FACTURA, la razón social es obligatoria";
      if (!fiscalAddress.trim()) return "Para emitir FACTURA, la dirección fiscal es obligatoria";
    } else if (docNumber.trim() && docType === "DNI") {
      const dniErr = validateDni(docNumber.trim());
      if (dniErr) return dniErr;
    }
    return null;
  };

  const submit = () => {
    if (!isExact) {
      setError(
        `El total cobrado (${formatCurrency(paid)}) no coincide con el total a pagar (${formatCurrency(total)})`,
      );
      return;
    }
    const invalid = drafts.find(
      (d) => !d.amount || Number(d.amount) <= 0 || Number.isNaN(Number(d.amount)),
    );
    if (invalid) {
      setError("Cada línea de pago debe tener un monto mayor a 0");
      return;
    }
    const fErr = validateFiscal();
    if (fErr) {
      setFiscalError(fErr);
      setError(null);
      return;
    }
    setError(null);
    setFiscalError(null);

    const trimmedDoc = docNumber.trim();
    const trimmedLegal = legalName.trim();
    const trimmedAddr = fiscalAddress.trim();
    const trimmedEmail = email.trim();

    const customerFiscal: PosSaleCustomerFiscalPayload | undefined =
      receiptType === "FACTURA" ||
      trimmedDoc ||
      trimmedLegal ||
      trimmedAddr ||
      trimmedEmail
        ? {
            documentType: docType,
            documentNumber: trimmedDoc || undefined,
            legalName: trimmedLegal || undefined,
            fiscalAddress: trimmedAddr || undefined,
            email: trimmedEmail || undefined,
          }
        : undefined;

    onConfirm({
      payments: drafts.map((d) => ({
        method: d.method,
        amount: Number(d.amount),
        reference: d.reference.trim() || undefined,
      })),
      receiptType,
      customerFiscal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobrar venta</DialogTitle>
          <DialogDescription>
            Total a cobrar:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(total)}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* ── Resumen fiscal ────────────────────────────────────────── */}
        <FiscalSummary
          subtotalUntaxed={subtotalUntaxed}
          igvAmount={igvAmount}
          igvRate={igvRate}
          total={total}
        />

        {/* ── Selector comprobante ──────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0A0A0A]/55">
            Tipo de comprobante
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ReceiptOption
              icon={Receipt}
              label={RECEIPT_TYPE_LABEL.BOLETA}
              description="Persona natural — DNI opcional"
              active={receiptType === "BOLETA"}
              onClick={() => setReceiptType("BOLETA")}
            />
            <ReceiptOption
              icon={FileText}
              label={RECEIPT_TYPE_LABEL.FACTURA}
              description="Empresa — requiere RUC"
              active={receiptType === "FACTURA"}
              onClick={() => setReceiptType("FACTURA")}
            />
          </div>
        </div>

        {/* ── Datos fiscales del cliente ────────────────────────────── */}
        <div className="space-y-3 rounded-xl border border-[#11111111] bg-[#FAFAFA] p-3">
          <div className="flex items-center gap-2">
            <ScrollText className="size-3.5 text-[#9810FA]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9810FA]">
              {receiptType === "FACTURA" ? "Datos de facturación" : "Datos del cliente"}
            </p>
            {customer ? (
              <span className="ml-auto text-[10px] text-[#0A0A0A]/50">
                CRM: {customer.fullName}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <FormField label="Tipo documento" htmlFor="pay-doc-type" className="col-span-1">
              <select
                id="pay-doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value as CustomerDocumentType)}
                disabled={isLoading || receiptType === "FACTURA"}
                className="flex h-9 w-full rounded-md border border-[#11111122] bg-white px-2 text-sm text-[#0A0A0A] disabled:opacity-60"
              >
                {(Object.keys(DOCUMENT_TYPE_LABEL) as CustomerDocumentType[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {DOCUMENT_TYPE_LABEL[t]}
                    </option>
                  ),
                )}
              </select>
            </FormField>
            <FormField
              label={docType === "RUC" ? "RUC" : "Número documento"}
              htmlFor="pay-doc-num"
              className="col-span-2"
              required={receiptType === "FACTURA"}
            >
              <Input
                id="pay-doc-num"
                value={docNumber}
                onChange={(e) =>
                  setDocNumber(e.target.value.replace(/\s/g, "").toUpperCase())
                }
                placeholder={
                  docType === "RUC"
                    ? "20512345678"
                    : docType === "DNI"
                      ? "70123456"
                      : "AB123456"
                }
                disabled={isLoading}
                className="h-9 tabular-nums"
              />
            </FormField>
          </div>

          {receiptType === "FACTURA" || legalName || fiscalAddress ? (
            <>
              <FormField
                label="Razón social"
                htmlFor="pay-legal"
                required={receiptType === "FACTURA"}
              >
                <Input
                  id="pay-legal"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Comercializadora Aurora S.A.C."
                  disabled={isLoading}
                  className="h-9"
                />
              </FormField>
              <FormField
                label="Dirección fiscal"
                htmlFor="pay-addr"
                required={receiptType === "FACTURA"}
              >
                <Input
                  id="pay-addr"
                  value={fiscalAddress}
                  onChange={(e) => setFiscalAddress(e.target.value)}
                  placeholder="Av. Javier Prado Este 1234, San Isidro, Lima"
                  disabled={isLoading}
                  className="h-9"
                />
              </FormField>
            </>
          ) : null}

          <FormField label="Email del cliente (envío comprobante)" htmlFor="pay-email">
            <Input
              id="pay-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@correo.com"
              disabled={isLoading}
              className="h-9"
            />
          </FormField>

          {fiscalError ? (
            <p className="rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
              {fiscalError}
            </p>
          ) : null}
        </div>

        {/* ── Métodos de pago ──────────────────────────────────────── */}
        <div className="space-y-2">
          {drafts.map((d, idx) => (
            <div
              key={d.id}
              className="space-y-2 rounded-lg border border-[#11111111] bg-[#FAFAFA] p-2"
            >
              <div className="grid grid-cols-4 gap-1">
                {METHOD_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = d.method === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update(d.id, { method: opt.value })}
                      disabled={isLoading}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors",
                        selected
                          ? "border-[#9810FA]/40 bg-[#9810FA]/8 text-[#9810FA]"
                          : "border-[#11111111] bg-white text-[#0A0A0A]/65 hover:border-[#11111122] hover:bg-[#FAFAFA]",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {PAYMENT_METHOD_LABEL[opt.value]}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={d.amount}
                  onChange={(e) => update(d.id, { amount: e.target.value })}
                  placeholder="Monto S/"
                  disabled={isLoading}
                  className="h-9 text-right tabular-nums"
                />
                {d.method !== "CASH" ? (
                  <Input
                    value={d.reference}
                    onChange={(e) => update(d.id, { reference: e.target.value })}
                    placeholder={
                      d.method === "YAPE" ? "N° operación" : "Voucher / referencia"
                    }
                    disabled={isLoading}
                    className="h-9 flex-1"
                  />
                ) : null}
                {drafts.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(d.id)}
                    aria-label="Eliminar línea"
                    disabled={isLoading}
                    className="size-9"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
                {idx === 0 && drafts.length === 1 ? <div className="w-9" /> : null}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={isLoading || drafts.length >= 4 || isExact}
            className="w-full"
          >
            <Plus className="size-3" /> Agregar otro pago
          </Button>
        </div>

        <div className="rounded-lg border border-[#11111111] bg-[#FAFAFA] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#0A0A0A]/60">Cobrado</span>
            <span className="font-medium tabular-nums text-[#0A0A0A]">
              {formatCurrency(paid)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#0A0A0A]/60">Restante</span>
            <span
              className={cn(
                "font-medium tabular-nums",
                remaining > 0 ? "text-amber-600" : "text-[#0A0A0A]/60",
              )}
            >
              {formatCurrency(remaining)}
            </span>
          </div>
          {overflow > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-destructive">Vuelto (entregar)</span>
              <span className="font-medium tabular-nums text-destructive">
                {formatCurrency(overflow)}
              </span>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            isLoading={isLoading}
            disabled={!isExact || drafts.length === 0}
          >
            Confirmar venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReceiptOptionProps {
  icon: typeof Receipt;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function ReceiptOption({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: ReceiptOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
        active
          ? "border-[#9810FA]/45 bg-[#9810FA]/8 shadow-[0_8px_18px_-12px_rgba(152,16,250,0.45)]"
          : "border-[#11111111] bg-white hover:border-[#11111122] hover:bg-[#FAFAFA]",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          active
            ? "bg-[#9810FA]/15 text-[#9810FA]"
            : "bg-[#11111108] text-[#0A0A0A]/55",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            active ? "text-[#9810FA]" : "text-[#0A0A0A]",
          )}
        >
          {label}
        </p>
        <p className="text-[10px] leading-tight text-[#0A0A0A]/55">
          {description}
        </p>
      </div>
    </button>
  );
}

function FiscalSummary({
  subtotalUntaxed,
  igvAmount,
  igvRate,
  total,
}: {
  subtotalUntaxed: number;
  igvAmount: number;
  igvRate: number;
  total: number;
}) {
  return (
    <div className="rounded-xl border border-[#9810FA]/25 bg-[#9810FA]/6 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9810FA]">
        Desglose fiscal
      </p>
      <div className="mt-1.5 space-y-1 text-xs">
        <Row label="Subtotal (sin IGV)" value={formatCurrency(subtotalUntaxed)} />
        <Row label={`IGV ${igvRate.toFixed(0)}%`} value={formatCurrency(igvAmount)} />
        <div className="mt-1 flex items-center justify-between border-t border-[#9810FA]/15 pt-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9810FA]">
            Total a cobrar
          </span>
          <span className="text-base font-semibold tabular-nums text-[#0A0A0A]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#0A0A0A]/60">{label}</span>
      <span className="font-medium tabular-nums text-[#0A0A0A]">{value}</span>
    </div>
  );
}
