"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  productSchema,
  type ProductFormValues,
} from "../schemas/product.schema";
import {
  useCreateProduct,
  useUpdateProduct,
} from "../hooks/use-products";
import type {
  CreateProductPayload,
  ProductEntity,
  UpdateProductPayload,
} from "../types";
import { ProductImageEditor } from "./product-image-editor";
import { ProductVariantEditor } from "./product-variant-editor";
import { ProductCategoryPicker } from "./product-category-picker";

interface ProductFormProps {
  initial?: ProductEntity;
  mode: "create" | "edit";
}

const toPayload = (values: ProductFormValues): CreateProductPayload => ({
  name: values.name,
  slug: values.slug?.trim() || undefined,
  description: values.description?.trim() || undefined,
  sku: values.sku.trim(),
  barcode: values.barcode?.trim() || undefined,
  price: values.price,
  memberPrice: values.memberPrice,
  cost: values.cost ?? 0,
  featured: values.featured ?? false,
  active: values.active ?? true,
  categoryIds: values.categoryIds ?? [],
  images:
    values.images?.map((img, i) => ({
      url: img.url.trim(),
      order: img.order ?? i,
    })) ?? [],
  variants:
    values.variants?.map((v) => ({
      name: v.name.trim(),
      value: v.value.trim(),
    })) ?? [],
});

export function ProductForm({ initial, mode }: ProductFormProps) {
  const router = useRouter();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(initial?.id ?? "");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      sku: initial?.sku ?? "",
      barcode: initial?.barcode ?? "",
      price: initial?.price ?? 0,
      memberPrice: initial?.memberPrice ?? 0,
      cost: initial?.cost ?? 0,
      featured: initial?.featured ?? false,
      active: initial?.active ?? true,
      categoryIds: initial?.categories.map((c) => c.id) ?? [],
      images:
        initial?.images.map((img) => ({ url: img.url, order: img.order })) ??
        [],
      variants:
        initial?.variants.map((v) => ({ name: v.name, value: v.value })) ?? [],
    },
  });

  const featured = watch("featured");
  const active = watch("active");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(toPayload(values));
        toast.success("Producto creado");
        router.push(`/productos/${created.id}`);
      } else if (initial) {
        await updateMutation.mutateAsync(
          toPayload(values) as UpdateProductPayload,
        );
        toast.success("Producto actualizado");
      }
    } catch (error) {
      toast.error("No se pudo guardar", extractErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Nombre"
                  htmlFor="name"
                  required
                  error={errors.name?.message}
                >
                  <Input
                    id="name"
                    placeholder="Collar Eternidad Acero Dorado"
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
                    placeholder="collar-eternidad-acero-dorado"
                    {...register("slug")}
                  />
                </FormField>
              </div>

              <FormField
                label="Descripción"
                htmlFor="description"
                error={errors.description?.message}
              >
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Detalle del producto, materiales, dimensiones…"
                  {...register("description")}
                />
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="SKU"
                  htmlFor="sku"
                  required
                  error={errors.sku?.message}
                >
                  <Input
                    id="sku"
                    placeholder="JOY-COLL-001"
                    {...register("sku")}
                  />
                </FormField>

                <FormField
                  label="Código de barras"
                  htmlFor="barcode"
                  error={errors.barcode?.message}
                >
                  <Input
                    id="barcode"
                    placeholder="7501234567890"
                    {...register("barcode")}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  label="Precio normal (PEN)"
                  htmlFor="price"
                  required
                  error={errors.price?.message}
                >
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min={0}
                    {...register("price", { valueAsNumber: true })}
                  />
                </FormField>
                <FormField
                  label="Precio miembro (PEN)"
                  htmlFor="memberPrice"
                  required
                  description="Precio con descuento para miembros Púrpura Club."
                  error={errors.memberPrice?.message}
                >
                  <Input
                    id="memberPrice"
                    type="number"
                    step="0.01"
                    min={0}
                    {...register("memberPrice", { valueAsNumber: true })}
                  />
                </FormField>
                <FormField
                  label="Costo (PEN)"
                  htmlFor="cost"
                  description="Costo de adquisición (no se muestra al cliente)."
                  error={errors.cost?.message}
                >
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min={0}
                    {...register("cost", { valueAsNumber: true })}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Controller
                control={control}
                name="images"
                render={({ field }) => (
                  <ProductImageEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Controller
                control={control}
                name="variants"
                render={({ field }) => (
                  <ProductVariantEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visibilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Producto destacado"
                description="Aparece en colecciones destacadas del ecommerce."
              >
                <Select
                  value={featured ? "true" : "false"}
                  onValueChange={(v) =>
                    setValue("featured", v === "true", { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sí, destacado</SelectItem>
                    <SelectItem value="false">No destacado</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Controller
                control={control}
                name="categoryIds"
                render={({ field }) => (
                  <ProductCategoryPicker
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={
            isSubmitting || createMutation.isPending || updateMutation.isPending
          }
        >
          {mode === "create" ? "Crear producto" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
