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
  branchSchema,
  type BranchFormValues,
} from "../schemas/branch.schema";
import { useCreateBranch, useUpdateBranch } from "../hooks/use-branches";
import type {
  BranchEntity,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: BranchEntity | null;
}

const toPayload = (values: BranchFormValues): CreateBranchPayload => ({
  name: values.name,
  slug: values.slug?.trim() || undefined,
  address: values.address?.trim() || undefined,
  phone: values.phone?.trim() || undefined,
  active: values.active ?? true,
});

export function BranchDialog({ open, onOpenChange, initial }: Props) {
  const mode = initial ? "edit" : "create";
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch(initial?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      address: initial?.address ?? "",
      phone: initial?.phone ?? "",
      active: initial?.active ?? true,
    },
  });

  const active = watch("active");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(toPayload(values));
        toast.success("Sucursal creada");
      } else if (initial) {
        await updateMutation.mutateAsync(
          toPayload(values) as UpdateBranchPayload,
        );
        toast.success("Sucursal actualizada");
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
            {mode === "create" ? "Nueva sucursal" : "Editar sucursal"}
          </DialogTitle>
          <DialogDescription>
            Las sucursales definen dónde se almacena el inventario.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="space-y-4"
          noValidate
          id="branch-form"
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
                placeholder="Sucursal Mall del Sur"
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
                placeholder="mall-del-sur"
                {...register("slug")}
              />
            </FormField>
          </div>

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
            form="branch-form"
            isLoading={
              isSubmitting ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {mode === "create" ? "Crear sucursal" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
