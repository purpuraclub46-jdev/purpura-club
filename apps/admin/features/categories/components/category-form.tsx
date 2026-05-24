"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
  categorySchema,
  type CategoryFormValues,
} from "../schemas/category.schema";
import {
  useCreateCategory,
  useUpdateCategory,
} from "../hooks/use-categories";
import type {
  CategoryEntity,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "../types";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CategoryEntity | null;
}

const toPayload = (values: CategoryFormValues): CreateCategoryPayload => ({
  name: values.name,
  slug: values.slug?.trim() || undefined,
  image: values.image?.trim() || undefined,
  group: values.group,
  order: values.order ?? 0,
  active: values.active ?? true,
});

export function CategoryDialog({
  open,
  onOpenChange,
  initial,
}: CategoryDialogProps) {
  const mode = initial ? "edit" : "create";
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(initial?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      image: initial?.image ?? "",
      group: initial?.group ?? "JOYERIA",
      order: initial?.order ?? 0,
      active: initial?.active ?? true,
    },
  });

  const group = watch("group");
  const active = watch("active");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(toPayload(values));
        toast.success("Categoría creada");
      } else if (initial) {
        await updateMutation.mutateAsync(
          toPayload(values) as UpdateCategoryPayload,
        );
        toast.success("Categoría actualizada");
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
            {mode === "create" ? "Nueva categoría" : "Editar categoría"}
          </DialogTitle>
          <DialogDescription>
            Organiza el catálogo en grupos: Joyería, Perfumes y Accesorios.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="space-y-4"
          noValidate
          id="category-form"
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
                placeholder="Collares"
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
                placeholder="collares"
                {...register("slug")}
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Grupo" required error={errors.group?.message}>
              <Select
                value={group}
                onValueChange={(v) =>
                  setValue("group", v as CategoryFormValues["group"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JOYERIA">Joyería</SelectItem>
                  <SelectItem value="PERFUMES">Perfumes</SelectItem>
                  <SelectItem value="ACCESORIOS">Accesorios</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Orden"
              htmlFor="order"
              description="Menor número se muestra primero."
              error={errors.order?.message}
            >
              <Input
                id="order"
                type="number"
                min={0}
                {...register("order", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <FormField
            label="Imagen (URL)"
            htmlFor="image"
            error={errors.image?.message}
          >
            <Input
              id="image"
              type="url"
              placeholder="https://…"
              {...register("image")}
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
            form="category-form"
            isLoading={
              isSubmitting ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {mode === "create" ? "Crear categoría" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
