"use client";

import { Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField } from "@/shared/ui/form-field";
import { Input, Textarea } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { PERU_REGIONS } from "@/shared/lib/peru-regions";
import { toast } from "@/stores/toast.store";
import {
  useCreateAddress,
  useDeleteAddress,
  useMyAddresses,
  useSetDefaultAddress,
  useUpdateAddress,
} from "../hooks/use-account";
import {
  ADDRESS_TYPE_LABEL,
  type AddressEntity,
  type CreateAddressInput,
} from "@/types/api";

type Mode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; address: AddressEntity };

const REGIONS_DATALIST_ID = "pp-regions-peru";

export function AddressesTab() {
  const { data, isLoading } = useMyAddresses();
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Mis direcciones" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const addresses = data ?? [];
  const shippingAddresses = addresses.filter((a) => a.type === "SHIPPING");

  if (mode.kind !== "list") {
    return (
      <AddressFormPanel
        mode={mode}
        onCancel={() => setMode({ kind: "list" })}
        onSuccess={() => setMode({ kind: "list" })}
      />
    );
  }

  if (shippingAddresses.length === 0) {
    return (
      <div className="space-y-5">
        <SectionHeader title="Mis direcciones" />
        <EmptyState
          icon={MapPin}
          title="Aún no tienes direcciones registradas"
          description="Guarda tus direcciones para agilizar futuras compras."
          action={
            <Button onClick={() => setMode({ kind: "create" })}>
              Agregar dirección
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          title="Mis direcciones"
          description="Direcciones guardadas para tus pedidos."
        />
        <Button
          size="sm"
          onClick={() => setMode({ kind: "create" })}
          className="shrink-0"
        >
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </div>

      <ul className="space-y-3">
        {shippingAddresses.map((a) => (
          <AddressCard
            key={a.id}
            address={a}
            onEdit={() => setMode({ kind: "edit", address: a })}
          />
        ))}
      </ul>
      <RegionsDatalist />
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="space-y-1">
      <h2 className="font-serif text-2xl tracking-tight text-[#0A0A0A] sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="text-sm text-[#0A0A0A]/55">{description}</p>
      ) : null}
    </header>
  );
}

function AddressCard({
  address,
  onEdit,
}: {
  address: AddressEntity;
  onEdit: () => void;
}) {
  const setDefault = useSetDefaultAddress();
  const remove = useDeleteAddress();

  return (
    <li className="lux-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#0A0A0A]">
              {address.label || ADDRESS_TYPE_LABEL[address.type]}
            </p>
            {address.isDefault ? (
              <Badge tone="accentSoft">
                <Star className="size-2.5" />
                Principal
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-[#0A0A0A]/55">
            {address.recipientName} · {address.recipientPhone}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-0.5 text-sm text-[#0A0A0A]">
        <p>
          {address.street} {address.number}
          {address.apartment ? `, ${address.apartment}` : ""}
        </p>
        <p className="text-[#0A0A0A]/65">
          {address.district}, {address.province}, {address.region}
        </p>
        {address.reference ? (
          <p className="text-xs text-[#0A0A0A]/55">{address.reference}</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1">
        {!address.isDefault ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDefault.mutate(address.id, {
                onSuccess: () => toast.success("Marcada como principal"),
                onError: () =>
                  toast.error("No se pudo marcar como principal"),
              });
            }}
            isLoading={setDefault.isPending}
          >
            <Star className="size-3.5" />
            Marcar principal
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              !window.confirm("¿Eliminar esta dirección?")
            ) {
              return;
            }
            remove.mutate(address.id, {
              onSuccess: () => toast.success("Dirección eliminada"),
              onError: () => toast.error("No se pudo eliminar"),
            });
          }}
          isLoading={remove.isPending}
          className="text-[#e11d48] hover:bg-[#e11d48]/8 hover:text-[#e11d48]"
        >
          <Trash2 className="size-3.5" />
          Eliminar
        </Button>
      </div>
    </li>
  );
}

function RegionsDatalist() {
  return (
    <datalist id={REGIONS_DATALIST_ID}>
      {PERU_REGIONS.map((r) => (
        <option key={r} value={r} />
      ))}
    </datalist>
  );
}

// ─── Form panel ──────────────────────────────────────────────────────────

interface FormState {
  label: string;
  recipientName: string;
  recipientPhone: string;
  street: string;
  number: string;
  apartment: string;
  district: string;
  province: string;
  region: string;
  reference: string;
  isDefault: boolean;
}

function emptyForm(): FormState {
  return {
    label: "",
    recipientName: "",
    recipientPhone: "",
    street: "",
    number: "",
    apartment: "",
    district: "",
    province: "",
    region: "",
    reference: "",
    isDefault: false,
  };
}

function fromAddress(a: AddressEntity): FormState {
  return {
    label: a.label ?? "",
    recipientName: a.recipientName,
    recipientPhone: a.recipientPhone,
    street: a.street,
    number: a.number,
    apartment: a.apartment ?? "",
    district: a.district,
    province: a.province,
    region: a.region,
    reference: a.reference ?? "",
    isDefault: a.isDefault,
  };
}

const REQUIRED_FIELDS: Array<keyof FormState> = [
  "recipientName",
  "recipientPhone",
  "street",
  "number",
  "district",
  "province",
  "region",
];

function AddressFormPanel({
  mode,
  onCancel,
  onSuccess,
}: {
  mode: { kind: "create" } | { kind: "edit"; address: AddressEntity };
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEdit = mode.kind === "edit";
  const [state, setState] = useState<FormState>(
    isEdit ? fromAddress(mode.address) : emptyForm(),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  const create = useCreateAddress();
  const update = useUpdateAddress();
  const isPending = create.isPending || update.isPending;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    for (const f of REQUIRED_FIELDS) {
      if (!String(state[f] ?? "").trim()) {
        next[f] = "Requerido";
      }
    }
    if (state.recipientPhone && state.recipientPhone.length < 6) {
      next.recipientPhone = "Teléfono incompleto";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: CreateAddressInput = {
      label: state.label.trim() || undefined,
      recipientName: state.recipientName.trim(),
      recipientPhone: state.recipientPhone.trim(),
      street: state.street.trim(),
      number: state.number.trim(),
      apartment: state.apartment.trim() || undefined,
      district: state.district.trim(),
      province: state.province.trim(),
      region: state.region.trim(),
      reference: state.reference.trim() || undefined,
      isDefault: state.isDefault,
    };

    const onError = (err: unknown) => {
      const status = (err as { response?: { status?: number } } | null)?.response
        ?.status;
      if (status === 409) {
        toast.error(
          "Límite alcanzado",
          "Alcanzaste el máximo de direcciones activas.",
        );
      } else {
        toast.error("No se pudo guardar la dirección");
      }
    };

    if (isEdit) {
      update.mutate(
        { id: mode.address.id, input: payload },
        {
          onSuccess: () => {
            toast.success("Dirección actualizada");
            onSuccess();
          },
          onError,
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Dirección agregada");
          onSuccess();
        },
        onError,
      });
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <SectionHeader
        title={isEdit ? "Editar dirección" : "Nueva dirección"}
        description={
          isEdit
            ? "Modifica los datos de tu dirección guardada."
            : "Guarda esta dirección para tus próximos pedidos."
        }
      />

      <div className="lux-card space-y-4 rounded-2xl p-5 sm:p-6">
        <FormField label="Etiqueta">
          <Input
            value={state.label}
            onChange={(e) => setField("label", e.target.value)}
            placeholder="Casa, Trabajo, Mamá…"
            maxLength={60}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Nombre del receptor"
            required
            error={errors.recipientName}
          >
            <Input
              value={state.recipientName}
              onChange={(e) => setField("recipientName", e.target.value)}
              maxLength={120}
              autoComplete="name"
            />
          </FormField>
          <FormField
            label="Teléfono del receptor"
            required
            error={errors.recipientPhone}
          >
            <Input
              type="tel"
              value={state.recipientPhone}
              onChange={(e) => setField("recipientPhone", e.target.value)}
              maxLength={20}
              autoComplete="tel"
              inputMode="tel"
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <FormField label="Calle / avenida" required error={errors.street}>
            <Input
              value={state.street}
              onChange={(e) => setField("street", e.target.value)}
              maxLength={200}
              autoComplete="address-line1"
            />
          </FormField>
          <FormField label="Número" required error={errors.number}>
            <Input
              value={state.number}
              onChange={(e) => setField("number", e.target.value)}
              maxLength={20}
              inputMode="numeric"
            />
          </FormField>
        </div>

        <FormField label="Interior / Dpto. (opcional)">
          <Input
            value={state.apartment}
            onChange={(e) => setField("apartment", e.target.value)}
            maxLength={60}
            placeholder="Dpto 502, Casa interior, etc."
            autoComplete="address-line2"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Distrito" required error={errors.district}>
            <Input
              value={state.district}
              onChange={(e) => setField("district", e.target.value)}
              maxLength={80}
              autoComplete="address-level3"
            />
          </FormField>
          <FormField label="Provincia" required error={errors.province}>
            <Input
              value={state.province}
              onChange={(e) => setField("province", e.target.value)}
              maxLength={80}
              autoComplete="address-level2"
            />
          </FormField>
          <FormField
            label="Región"
            required
            error={errors.region}
            description="Sugerencias del catálogo Perú"
          >
            <Input
              value={state.region}
              onChange={(e) => setField("region", e.target.value)}
              maxLength={80}
              list={REGIONS_DATALIST_ID}
              autoComplete="address-level1"
            />
          </FormField>
        </div>

        <FormField label="Referencia (opcional)">
          <Textarea
            value={state.reference}
            onChange={(e) => setField("reference", e.target.value)}
            maxLength={240}
            rows={2}
            placeholder="Edificio azul, frente al parque…"
          />
        </FormField>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border border-[#11111118] p-3 transition-colors",
            state.isDefault && "border-[#9810FA]/30 bg-[#9810FA]/4",
          )}
        >
          <input
            type="checkbox"
            checked={state.isDefault}
            onChange={(e) => setField("isDefault", e.target.checked)}
            className="mt-0.5 size-4 accent-[#9810FA]"
          />
          <div className="text-sm">
            <p className="font-medium text-[#0A0A0A]">
              Marcar como principal
            </p>
            <p className="text-xs text-[#0A0A0A]/55">
              La usaremos por defecto en futuros pedidos.
            </p>
          </div>
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" isLoading={isPending}>
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          {isEdit ? "Guardar cambios" : "Agregar dirección"}
        </Button>
      </div>
      <RegionsDatalist />
    </form>
  );
}
