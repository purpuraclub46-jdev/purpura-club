"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { FormField } from "@/shared/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  locationSchema,
  type LocationFormValues,
} from "../schemas/location.schema";
import {
  useCreateLocation,
  useUpdateLocation,
} from "../hooks/use-locations";
import {
  LOCATION_TYPE_DESCRIPTION,
  LOCATION_TYPE_LABEL,
  type CreateLocationPayload,
  type LocationEntity,
  type UpdateLocationPayload,
} from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: LocationEntity | null;
}

const toPayload = (values: LocationFormValues): CreateLocationPayload => ({
  name: values.name,
  slug: values.slug?.trim() || undefined,
  type: values.type,
  address: values.address?.trim() || undefined,
  phone: values.phone?.trim() || undefined,
  active: values.active ?? true,
});

export function LocationDialog({ open, onOpenChange, initial }: Props) {
  const mode = initial ? "edit" : "create";
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation(initial?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      type: initial?.type ?? "SUCURSAL",
      address: initial?.address ?? "",
      phone: initial?.phone ?? "",
      active: initial?.active ?? true,
    },
  });

  const type = watch("type");
  const active = watch("active");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(toPayload(values));
        toast.success("Ubicación creada");
      } else if (initial) {
        await updateMutation.mutateAsync(
          toPayload(values) as UpdateLocationPayload,
        );
        toast.success("Ubicación actualizada");
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo guardar", extractErrorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva ubicación" : "Editar ubicación"}
          </DialogTitle>
          <DialogDescription>
            Define dónde se almacena y mueve el inventario (ecommerce, sucursal
            o almacén).
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="space-y-4"
          noValidate
          id="location-form"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Nombre"
              htmlFor="name"
              required
              error={errors.name?.message}
            >
              <Input
                id="name"
                placeholder="Ecommerce Central"
                {...register("name")}
              />
            </FormField>
            <FormField
              label="Slug"
              htmlFor="slug"
              description="Se autogenera si lo dejas vacío."
              error={errors.slug?.message}
            >
              <Input
                id="slug"
                placeholder="ecommerce-central"
                {...register("slug")}
              />
            </FormField>
          </div>

          <FormField
            label="Tipo de ubicación"
            required
            description={LOCATION_TYPE_DESCRIPTION[type]}
            error={errors.type?.message}
          >
            <Select
              value={type}
              onValueChange={(v) =>
                setValue("type", v as LocationFormValues["type"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ECOMMERCE">
                  {LOCATION_TYPE_LABEL.ECOMMERCE}
                </SelectItem>
                <SelectItem value="SUCURSAL">
                  {LOCATION_TYPE_LABEL.SUCURSAL}
                </SelectItem>
                <SelectItem value="ALMACEN">
                  {LOCATION_TYPE_LABEL.ALMACEN}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Dirección"
            htmlFor="address"
            error={errors.address?.message}
          >
            <Textarea
              id="address"
              rows={2}
              placeholder="Av. Principal 123, Lima"
              {...register("address")}
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Teléfono"
              htmlFor="phone"
              error={errors.phone?.message}
            >
              <Input
                id="phone"
                placeholder="+51 999 999 999"
                {...register("phone")}
              />
            </FormField>
            <FormField label="Estado">
              <Select
                value={active ? "true" : "false"}
                onValueChange={(v) =>
                  setValue("active", v === "true", { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activa</SelectItem>
                  <SelectItem value="false">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="location-form"
            isLoading={
              isSubmitting ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {mode === "create" ? "Crear ubicación" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
