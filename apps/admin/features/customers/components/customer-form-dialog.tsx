"use client";

import { useEffect, useState } from "react";
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
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useLocationsList } from "@/features/locations/hooks/use-locations";
import { DOCUMENT_TYPE_LABEL } from "@/types/api";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/use-customers";
import {
  GENDER_LABEL,
  type CustomerDocumentType,
  type CustomerEntity,
  type CustomerGender,
} from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CustomerEntity | null;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dni: string;
  documentType: CustomerDocumentType;
  ruc: string;
  legalName: string;
  fiscalAddress: string;
  birthDate: string;
  gender: CustomerGender | "";
  notes: string;
  primaryLocationId: string;
  active: boolean;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dni: "",
  documentType: "DNI",
  ruc: "",
  legalName: "",
  fiscalAddress: "",
  birthDate: "",
  gender: "",
  notes: "",
  primaryLocationId: "",
  active: true,
};

const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function CustomerFormDialog({ open, onOpenChange, initial }: Props) {
  const isEdit = Boolean(initial);
  const create = useCreateCustomer();
  const update = useUpdateCustomer(initial?.id ?? "");
  const { data: locationsPage } = useLocationsList({ limit: 100 });
  const locations = locationsPage?.items ?? [];

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        firstName: initial.firstName,
        lastName: initial.lastName,
        email: initial.email ?? "",
        phone: initial.phone ?? "",
        dni: initial.dni ?? "",
        documentType: initial.documentType ?? "DNI",
        ruc: initial.ruc ?? "",
        legalName: initial.legalName ?? "",
        fiscalAddress: initial.fiscalAddress ?? "",
        birthDate: toDateInput(initial.birthDate),
        gender: initial.gender ?? "",
        notes: initial.notes ?? "",
        primaryLocationId: initial.primaryLocation?.id ?? "",
        active: initial.active,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [open, initial]);

  const isLoading = create.isPending || update.isPending;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "Nombre obligatorio";
    if (!form.lastName.trim()) next.lastName = "Apellido obligatorio";
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      next.email = "Email inválido";
    }
    if (form.documentType === "RUC") {
      if (!form.ruc.trim()) next.ruc = "RUC obligatorio";
      else if (!/^\d{11}$/.test(form.ruc.trim()))
        next.ruc = "RUC debe tener 11 dígitos";
      if (!form.legalName.trim())
        next.legalName = "Razón social obligatoria para clientes con RUC";
      if (!form.fiscalAddress.trim())
        next.fiscalAddress = "Dirección fiscal obligatoria para clientes con RUC";
    } else if (form.dni.trim() && form.documentType === "DNI") {
      if (!/^\d{8}$/.test(form.dni.trim()))
        next.dni = "DNI debe tener 8 dígitos";
    }
    if (form.ruc.trim() && !/^\d{11}$/.test(form.ruc.trim())) {
      next.ruc = "RUC debe tener 11 dígitos";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dni: form.dni.trim() || undefined,
        documentType: form.documentType,
        ruc: form.ruc.trim() || undefined,
        legalName: form.legalName.trim() || undefined,
        fiscalAddress: form.fiscalAddress.trim() || undefined,
        birthDate: form.birthDate || undefined,
        gender: (form.gender || undefined) as CustomerGender | undefined,
        notes: form.notes.trim() || undefined,
        primaryLocationId: form.primaryLocationId || null,
        active: form.active,
      };

      if (isEdit && initial) {
        await update.mutateAsync(payload);
        toast.success("Cliente actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Cliente creado");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(
        isEdit ? "No se pudo actualizar el cliente" : "No se pudo crear el cliente",
        extractErrorMessage(e),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar cliente" : "Crear nuevo cliente"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de contacto y la sucursal asignada."
              : "Registra un cliente del CRM. Útil para captación POS o registro manual."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Nombre"
            htmlFor="cust-firstName"
            required
            error={errors.firstName}
          >
            <Input
              id="cust-firstName"
              value={form.firstName}
              onChange={(e) =>
                setForm((p) => ({ ...p, firstName: e.target.value }))
              }
              placeholder="María"
            />
          </FormField>
          <FormField
            label="Apellido"
            htmlFor="cust-lastName"
            required
            error={errors.lastName}
          >
            <Input
              id="cust-lastName"
              value={form.lastName}
              onChange={(e) =>
                setForm((p) => ({ ...p, lastName: e.target.value }))
              }
              placeholder="Pérez"
            />
          </FormField>

          <FormField
            label="Tipo de documento"
            htmlFor="cust-doc-type"
            description="DNI para persona natural, RUC para empresas (habilita factura)."
          >
            <select
              id="cust-doc-type"
              value={form.documentType}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  documentType: e.target.value as CustomerDocumentType,
                }))
              }
              className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
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
          <FormField label="Teléfono" htmlFor="cust-phone">
            <Input
              id="cust-phone"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="+51 987 654 321"
            />
          </FormField>

          <FormField
            label="DNI / Documento personal"
            htmlFor="cust-dni"
            description="Único. Para personas naturales o documentos no peruanos."
            error={errors.dni}
          >
            <Input
              id="cust-dni"
              value={form.dni}
              onChange={(e) =>
                setForm((p) => ({ ...p, dni: e.target.value }))
              }
              placeholder="70123456"
            />
          </FormField>
          <FormField
            label="RUC (opcional para empresas)"
            htmlFor="cust-ruc"
            description="11 dígitos. Requerido para emitir facturas SUNAT."
            required={form.documentType === "RUC"}
            error={errors.ruc}
          >
            <Input
              id="cust-ruc"
              value={form.ruc}
              onChange={(e) =>
                setForm((p) => ({ ...p, ruc: e.target.value }))
              }
              placeholder="20512345678"
            />
          </FormField>

          <FormField
            label="Razón social"
            htmlFor="cust-legal-name"
            description="Nombre legal para facturas (empresas) o nombre completo del titular."
            required={form.documentType === "RUC"}
            error={errors.legalName}
            className="md:col-span-2"
          >
            <Input
              id="cust-legal-name"
              value={form.legalName}
              onChange={(e) =>
                setForm((p) => ({ ...p, legalName: e.target.value }))
              }
              placeholder="Comercializadora Aurora S.A.C."
            />
          </FormField>

          <FormField
            label="Dirección fiscal"
            htmlFor="cust-fiscal-addr"
            description="Obligatoria para facturas SUNAT."
            required={form.documentType === "RUC"}
            error={errors.fiscalAddress}
            className="md:col-span-2"
          >
            <Input
              id="cust-fiscal-addr"
              value={form.fiscalAddress}
              onChange={(e) =>
                setForm((p) => ({ ...p, fiscalAddress: e.target.value }))
              }
              placeholder="Av. Javier Prado Este 1234, San Isidro, Lima"
            />
          </FormField>

          <FormField
            label="Email"
            htmlFor="cust-email"
            error={errors.email}
            className="md:col-span-2"
          >
            <Input
              id="cust-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="cliente@correo.com"
            />
          </FormField>

          <FormField label="Fecha de nacimiento" htmlFor="cust-birth">
            <Input
              id="cust-birth"
              type="date"
              value={form.birthDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, birthDate: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Género" htmlFor="cust-gender">
            <select
              id="cust-gender"
              value={form.gender}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  gender: (e.target.value || "") as CustomerGender | "",
                }))
              }
              className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              <option value="">Sin especificar</option>
              {(Object.keys(GENDER_LABEL) as CustomerGender[]).map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABEL[g]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Sucursal de captación"
            htmlFor="cust-location"
            description="Define qué sucursal podrá administrar este cliente desde POS."
            className="md:col-span-2"
          >
            <select
              id="cust-location"
              value={form.primaryLocationId}
              onChange={(e) =>
                setForm((p) => ({ ...p, primaryLocationId: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              <option value="">Sin sucursal asignada</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Notas internas" className="md:col-span-2">
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Preferencias, contacto adicional, observaciones…"
              rows={3}
            />
          </FormField>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border-strong bg-surface/40 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Cliente activo</p>
            <p className="text-xs text-muted-foreground">
              Los clientes inactivos no se sugieren en el POS ni reciben promociones.
            </p>
          </div>
          <Switch
            checked={form.active}
            onCheckedChange={(checked) =>
              setForm((p) => ({ ...p, active: checked }))
            }
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={isLoading}
          >
            {isEdit ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
