"use client";

import { useState } from "react";
import { Crown, Plus, Search, User, UserPlus, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  useCreateCustomer,
  useCustomerSearch,
} from "@/features/customers/hooks/use-customers";
import type { CustomerEntity } from "@/features/customers/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { FormField } from "@/shared/ui/form-field";

interface Props {
  customer: CustomerEntity | null;
  onChange: (c: CustomerEntity | null) => void;
}

export function CustomerPicker({ customer, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: results = [], isFetching } = useCustomerSearch(
    { q: search, limit: 8 },
    search.trim().length >= 3,
  );

  if (customer) {
    return (
      <div className="rounded-xl border border-[#9810FA]/25 bg-[#9810FA]/6 p-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#9810FA]/15 text-[#9810FA]">
            <User className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-[#0A0A0A]">
                {customer.fullName}
              </p>
              {customer.isMember ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#9810FA] px-1.5 py-0.5 text-[9px] font-medium text-white">
                  <Crown className="size-2.5" /> Miembro
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] text-[#0A0A0A]/60">
              {customer.dni ? <span>DNI {customer.dni}</span> : null}
              {customer.phone ? <span>· {customer.phone}</span> : null}
              {customer.email ? <span>· {customer.email}</span> : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            aria-label="Quitar cliente"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lux-card space-y-2 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por DNI, teléfono, nombre o email"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCreateOpen(true)}
            aria-label="Crear cliente rápido"
          >
            <UserPlus className="size-4" />
          </Button>
        </div>

        {search.trim().length >= 3 ? (
          <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-surface">
            {isFetching ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Buscando…
              </p>
            ) : results.length === 0 ? (
              <div className="space-y-1 p-3">
                <p className="text-xs text-muted-foreground">
                  Sin resultados para «{search}».
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-3" /> Crear cliente rápido
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(c);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[#9810FA]/5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-[#0A0A0A]">
                            {c.fullName}
                          </span>
                          {c.isMember ? (
                            <Crown className="size-3 text-[#9810FA]" />
                          ) : null}
                        </div>
                        <p className="truncate text-[10px] text-[#0A0A0A]/55">
                          {c.dni ? `DNI ${c.dni}` : ""}
                          {c.phone ? ` · ${c.phone}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Mínimo 3 caracteres para iniciar la búsqueda. Sin cliente = venta
            walk-in.
          </p>
        )}
      </div>

      <QuickCreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialSearch={search.trim()}
        onCreated={(c) => onChange(c)}
      />
    </>
  );
}

interface QuickCreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
  onCreated: (c: CustomerEntity) => void;
}

function QuickCreateCustomerDialog({
  open,
  onOpenChange,
  initialSearch,
  onCreated,
}: QuickCreateProps) {
  const create = useCreateCustomer();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-llenado: si la búsqueda parece DNI (solo dígitos), lo pone como dni
  // sino como firstName
  const handleOpen = (next: boolean) => {
    if (next && initialSearch) {
      if (/^\d+$/.test(initialSearch)) setDni(initialSearch);
      else setFirstName(initialSearch);
    } else if (!next) {
      setFirstName("");
      setLastName("");
      setDni("");
      setPhone("");
      setErrors({});
    }
    onOpenChange(next);
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "Nombre obligatorio";
    if (!lastName.trim()) next.lastName = "Apellido obligatorio";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const c = await create.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dni: dni.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      toast.success("Cliente creado");
      onCreated(c);
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo crear el cliente", extractErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear cliente rápido</DialogTitle>
          <DialogDescription>
            Datos mínimos. El cliente queda asignado a esta sucursal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nombre" required error={errors.firstName}>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
            />
          </FormField>
          <FormField label="Apellido" required error={errors.lastName}>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </FormField>
          <FormField label="DNI">
            <Input
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="70123456"
            />
          </FormField>
          <FormField label="Teléfono">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+51 987 654 321"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => void submit()} isLoading={create.isPending}>
            Crear y agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
