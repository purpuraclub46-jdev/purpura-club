"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Sparkles } from "lucide-react";
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
import { Switch } from "@/shared/ui/switch";
import { extractErrorMessage } from "@/services/http/client";
import { splitGross } from "@/shared/lib/fiscal";
import { formatCurrency } from "@/shared/lib/format";
import { computePricing } from "@/shared/lib/pricing";
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
  ProductAvailabilityPayload,
  ProductEntity,
  UpdateProductPayload,
} from "../types";
import { ProductAvailabilityEditor } from "./product-availability-editor";
import { ProductImageEditor } from "./product-image-editor";
import { ProductVariantEditor } from "./product-variant-editor";
import { ProductCategoryPicker } from "./product-category-picker";

interface ProductFormProps {
  initial?: ProductEntity;
  mode: "create" | "edit";
}

const toAvailability = (
  values: ProductFormValues,
): ProductAvailabilityPayload[] =>
  (values.availability ?? []).map((a) => ({
    inventoryLocationId: a.inventoryLocationId,
    active: a.active,
    initialStock: a.initialStock,
    minimumStock: a.minimumStock,
  }));

const toPayload = (values: ProductFormValues): CreateProductPayload => ({
  name: values.name,
  slug: values.slug?.trim() || undefined,
  description: values.description?.trim() || undefined,
  sku: values.sku.trim(),
  barcode: values.barcode?.trim() || undefined,
  price: values.price,
  cost: values.cost ?? 0,
  discountPercentage:
    values.discountPercentage === null || values.discountPercentage === undefined
      ? undefined
      : values.discountPercentage,
  discountActive: values.discountActive ?? false,
  discountStartsAt: values.discountStartsAt
    ? new Date(values.discountStartsAt).toISOString()
    : undefined,
  discountEndsAt: values.discountEndsAt
    ? new Date(values.discountEndsAt).toISOString()
    : undefined,
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
  availability: toAvailability(values),
});

const toLocalInputValue = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

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
      cost: initial?.cost ?? 0,
      discountPercentage: initial?.discountPercentage ?? null,
      discountActive: initial?.discountActive ?? false,
      discountStartsAt: toLocalInputValue(initial?.discountStartsAt),
      discountEndsAt: toLocalInputValue(initial?.discountEndsAt),
      featured: initial?.featured ?? false,
      active: initial?.active ?? true,
      categoryIds: initial?.categories.map((c) => c.id) ?? [],
      images:
        initial?.images.map((img) => ({ url: img.url, order: img.order })) ??
        [],
      variants:
        initial?.variants.map((v) => ({ name: v.name, value: v.value })) ?? [],
      availability:
        initial?.availability.map((a) => ({
          inventoryLocationId: a.inventoryLocationId,
          active: a.active,
          initialStock: a.stock,
          minimumStock: a.minimumStock,
        })) ?? [],
    },
  });

  const featured = watch("featured");
  const active = watch("active");
  const discountActive = watch("discountActive") ?? false;
  const discountPercentage = watch("discountPercentage");
  const price = watch("price");
  const discountStartsAt = watch("discountStartsAt");
  const discountEndsAt = watch("discountEndsAt");

  // Vista previa de precios computada en vivo.
  const preview = computePricing(
    {
      price: Number(price) || 0,
      discountPercentage:
        discountPercentage === null || discountPercentage === undefined
          ? null
          : Number(discountPercentage),
      discountActive: discountActive,
      discountStartsAt: discountStartsAt || null,
      discountEndsAt: discountEndsAt || null,
    },
    { isMember: true },
  );

  // Desglose fiscal en vivo del precio ingresado. El precio incluye IGV.
  const fiscalBreakdown = splitGross(Number(price) || 0);

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
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Precio de venta final (IGV incluido)"
                  htmlFor="price"
                  required
                  description="El sistema calcula automáticamente subtotal e IGV (18%)."
                  error={errors.price?.message}
                >
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="118.00"
                    inputMode="decimal"
                    {...register("price", { valueAsNumber: true })}
                  />
                </FormField>
                <FormField
                  label="Costo (PEN)"
                  htmlFor="cost"
                  description="Costo interno, no visible."
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

              <FiscalBreakdownPanel
                total={fiscalBreakdown.total}
                untaxed={fiscalBreakdown.untaxed}
                igv={fiscalBreakdown.igv}
                igvRate={fiscalBreakdown.igvRate}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <CardTitle>Oferta</CardTitle>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Activar oferta</span>
                  <Controller
                    control={control}
                    name="discountActive"
                    render={({ field }) => (
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        aria-label="Activar oferta"
                      />
                    )}
                  />
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                El precio de oferta se calcula automáticamente desde el precio
                normal y el porcentaje. Los miembros Púrpura Club reciben{" "}
                <span className="font-medium text-primary">10 % adicional</span>{" "}
                solo cuando la oferta está vigente.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  label="Porcentaje de descuento (%)"
                  htmlFor="discountPercentage"
                  error={errors.discountPercentage?.message}
                >
                  <Input
                    id="discountPercentage"
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    disabled={!discountActive}
                    placeholder="0"
                    {...register("discountPercentage", {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined
                          ? null
                          : Number(v),
                    })}
                  />
                </FormField>
                <FormField
                  label="Inicio de la oferta"
                  htmlFor="discountStartsAt"
                  description="Opcional. Si se omite, comienza de inmediato."
                  error={errors.discountStartsAt?.message}
                >
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="discountStartsAt"
                      type="datetime-local"
                      disabled={!discountActive}
                      {...register("discountStartsAt")}
                    />
                  </div>
                </FormField>
                <FormField
                  label="Fin de la oferta"
                  htmlFor="discountEndsAt"
                  description="Opcional. Si se omite, no caduca."
                  error={errors.discountEndsAt?.message}
                >
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="discountEndsAt"
                      type="datetime-local"
                      disabled={!discountActive}
                      {...register("discountEndsAt")}
                    />
                  </div>
                </FormField>
              </div>

              <div className="rounded-lg border border-border bg-surface/40 p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Previsualización de precios
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Precio normal
                    </p>
                    <p className="text-base font-medium tabular-nums">
                      {formatCurrency(preview.price)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Precio oferta
                    </p>
                    <p className="text-base font-semibold tabular-nums text-primary">
                      {preview.salePrice !== null
                        ? formatCurrency(preview.salePrice)
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Precio miembro (con 10% extra)
                    </p>
                    <p className="text-base font-semibold tabular-nums">
                      {preview.memberPrice !== null
                        ? formatCurrency(preview.memberPrice)
                        : "—"}
                    </p>
                  </div>
                </div>
                {!preview.discountActive ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Sin oferta vigente: cliente y miembro pagan{" "}
                    {formatCurrency(preview.price)}.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Controller
                control={control}
                name="availability"
                render={({ field }) => (
                  <ProductAvailabilityEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    hideInitialStock={mode === "edit"}
                  />
                )}
              />
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

/**
 * Panel de desglose fiscal en vivo. Aparece debajo del input de precio para
 * que el operador vea exactamente cómo se separa el IGV. Diseño minimal
 * premium — accent morado de Purpura Club, sin sombras agresivas.
 */
function FiscalBreakdownPanel({
  total,
  untaxed,
  igv,
  igvRate,
}: {
  total: number;
  untaxed: number;
  igv: number;
  igvRate: number;
}) {
  const empty = total <= 0;
  return (
    <div
      aria-live="polite"
      className="rounded-xl border border-[#9810FA]/25 bg-[#9810FA]/6 p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9810FA]">
          Desglose fiscal
        </p>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#0A0A0A]/45">
          Precios incluyen IGV · Perú
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FiscalCell
          label="Precio final"
          value={formatCurrency(total)}
          tone="primary"
          dimmed={empty}
        />
        <FiscalCell
          label="Subtotal"
          value={formatCurrency(untaxed)}
          dimmed={empty}
        />
        <FiscalCell
          label={`IGV (${igvRate.toFixed(0)}%)`}
          value={formatCurrency(igv)}
          dimmed={empty}
        />
      </div>

      {empty ? (
        <p className="mt-2 text-[11px] text-[#0A0A0A]/45">
          Ingresa un precio para ver el desglose en tiempo real.
        </p>
      ) : null}
    </div>
  );
}

function FiscalCell({
  label,
  value,
  tone,
  dimmed,
}: {
  label: string;
  value: string;
  tone?: "primary";
  dimmed?: boolean;
}) {
  return (
    <div
      className={
        tone === "primary"
          ? "rounded-lg border border-[#9810FA]/30 bg-white px-3 py-2.5"
          : "rounded-lg border border-[#11111111] bg-white/70 px-3 py-2.5"
      }
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#0A0A0A]/55">
        {label}
      </p>
      <p
        className={
          tone === "primary"
            ? `mt-0.5 text-xl font-semibold tabular-nums ${dimmed ? "text-[#0A0A0A]/35" : "text-[#9810FA]"}`
            : `mt-0.5 text-base font-semibold tabular-nums ${dimmed ? "text-[#0A0A0A]/35" : "text-[#0A0A0A]"}`
        }
      >
        {value}
      </p>
    </div>
  );
}
