"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  homeCategorySchema,
  type HomeCategoryFormValues,
} from "../schemas/home-category.schema";
import { useUpdateHomeCategory } from "../hooks/use-home-categories";
import { SLOT_META } from "../types";
import type {
  HomeCategoryEntity,
  HomeCategorySlot,
  UpdateHomeCategoryPayload,
} from "../types";

interface HomeCategoryFormProps {
  slot: HomeCategorySlot;
  initial: HomeCategoryEntity | null;
}

const toPayload = (
  values: HomeCategoryFormValues,
): UpdateHomeCategoryPayload => ({
  sortOrder: values.sortOrder,
  active: values.active,
  eyebrow: values.eyebrow || undefined,
  label: values.label,
  ctaHref: values.ctaHref,
  imageDesktop: values.imageDesktop || undefined,
  imageMobile: values.imageMobile || undefined,
  overlayColor: values.overlayColor,
  overlayOpacity: values.overlayOpacity,
});

export function HomeCategoryForm({ slot, initial }: HomeCategoryFormProps) {
  const meta = SLOT_META[slot];
  const updateMutation = useUpdateHomeCategory(slot);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<HomeCategoryFormValues>({
    resolver: zodResolver(homeCategorySchema),
    defaultValues: {
      sortOrder: initial?.sortOrder ?? defaultOrderFor(slot),
      active: initial?.active ?? true,
      eyebrow: initial?.eyebrow ?? meta.defaultEyebrow,
      label: initial?.label ?? meta.defaultLabel,
      ctaHref: initial?.ctaHref ?? meta.defaultCtaHref,
      imageDesktop: initial?.imageDesktop ?? "",
      imageMobile: initial?.imageMobile ?? "",
      overlayColor: initial?.overlayColor ?? "#0A0A0A",
      overlayOpacity: initial?.overlayOpacity ?? 35,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(toPayload(values));
      toast.success("Categoría actualizada");
    } catch (error) {
      toast.error("No se pudo guardar", extractErrorMessage(error));
    }
  });

  const active = watch("active");
  const overlayColor = watch("overlayColor");
  const overlayOpacity = watch("overlayOpacity");
  const imageDesktop = watch("imageDesktop");
  const imageMobile = watch("imageMobile");
  const eyebrow = watch("eyebrow");
  const label = watch("label");

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* ─── Estado y orden ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={active}
            onCheckedChange={(v) =>
              setValue("active", v, { shouldDirty: true })
            }
            aria-label="Card visible"
          />
          <Label className="cursor-pointer">
            {active ? (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Eye className="size-3.5" /> Visible en el carrusel
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <EyeOff className="size-3.5" /> Oculta
              </span>
            )}
          </Label>
        </div>

        <div className="w-24">
          <FormField
            label="Orden"
            htmlFor={`${slot}-sortOrder`}
            error={errors.sortOrder?.message}
          >
            <Input
              id={`${slot}-sortOrder`}
              type="number"
              min={0}
              max={99}
              {...register("sortOrder", { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </div>

      {/* ─── Texto ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Eyebrow"
          htmlFor={`${slot}-eyebrow`}
          description="Etiqueta superior (uppercase)."
          error={errors.eyebrow?.message}
        >
          <Input
            id={`${slot}-eyebrow`}
            {...register("eyebrow")}
            placeholder={meta.defaultEyebrow}
          />
        </FormField>

        <FormField
          label="Nombre"
          htmlFor={`${slot}-label`}
          required
          description="Texto principal de la card."
          error={errors.label?.message}
        >
          <Input
            id={`${slot}-label`}
            {...register("label")}
            placeholder={meta.defaultLabel}
          />
        </FormField>
      </div>

      <FormField
        label="Destino"
        htmlFor={`${slot}-ctaHref`}
        required
        description='Ruta relativa ("/shop?category=joyas") o URL absoluta.'
        error={errors.ctaHref?.message}
      >
        <Input
          id={`${slot}-ctaHref`}
          {...register("ctaHref")}
          placeholder={meta.defaultCtaHref}
        />
      </FormField>

      {/* ─── Imágenes ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Imagen desktop (URL)"
          htmlFor={`${slot}-imageDesktop`}
          description="Composición editorial. HTTPS."
          error={errors.imageDesktop?.message}
        >
          <Input
            id={`${slot}-imageDesktop`}
            type="url"
            {...register("imageDesktop")}
            placeholder="https://…/cat-desktop.jpg"
          />
          {imageDesktop ? (
            <ImagePreview src={imageDesktop} ratio="4/5" />
          ) : null}
        </FormField>
        <FormField
          label="Imagen mobile (URL)"
          htmlFor={`${slot}-imageMobile`}
          description="Crop vertical. NO reutilices el asset desktop."
          error={errors.imageMobile?.message}
        >
          <Input
            id={`${slot}-imageMobile`}
            type="url"
            {...register("imageMobile")}
            placeholder="https://…/cat-mobile.jpg"
          />
          {imageMobile ? (
            <ImagePreview src={imageMobile} ratio="3/4" />
          ) : null}
        </FormField>
      </div>

      {/* ─── Overlay ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Color del overlay"
          htmlFor={`${slot}-overlayColor`}
          description="HEX (ej. #0A0A0A)."
          error={errors.overlayColor?.message}
        >
          <div className="flex items-center gap-2">
            <Input
              id={`${slot}-overlayColor`}
              type="text"
              {...register("overlayColor")}
              className="font-mono"
            />
            <div
              aria-hidden
              className="size-9 shrink-0 rounded-md border border-border"
              style={{ backgroundColor: overlayColor }}
            />
          </div>
        </FormField>

        <FormField
          label={`Opacidad del overlay (${overlayOpacity}%)`}
          htmlFor={`${slot}-overlayOpacity`}
          description="Mayor opacidad = imagen más oscura, label más legible."
          error={errors.overlayOpacity?.message}
        >
          <input
            id={`${slot}-overlayOpacity`}
            type="range"
            min={0}
            max={100}
            step={5}
            {...register("overlayOpacity", { valueAsNumber: true })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </FormField>
      </div>

      {/* ─── Live preview ─── */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Vista previa de la card
        </p>
        <CardPreview
          label={label}
          eyebrow={eyebrow ?? null}
          image={imageDesktop || imageMobile || null}
          overlayColor={overlayColor}
          overlayOpacity={overlayOpacity}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          type="submit"
          isLoading={isSubmitting || updateMutation.isPending}
          disabled={!isDirty && !updateMutation.isPending}
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function ImagePreview({
  src,
  ratio,
}: {
  src: string;
  ratio: "3/4" | "4/5";
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Vista previa"
        className={
          ratio === "3/4"
            ? "mx-auto block h-48 w-auto object-cover"
            : "block h-32 w-full object-cover"
        }
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

function CardPreview({
  label,
  eyebrow,
  image,
  overlayColor,
  overlayOpacity,
}: {
  label: string;
  eyebrow: string | null;
  image: string | null;
  overlayColor: string;
  overlayOpacity: number;
}) {
  return (
    <div className="relative w-full max-w-[220px] overflow-hidden rounded-xl bg-[#0F0A14]">
      <div className="aspect-[4/5] w-full">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            aria-hidden
            className="size-full"
            style={{
              background:
                "radial-gradient(60% 60% at 30% 30%, #2a103e 0%, #0A0A0A 70%)",
            }}
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundColor: overlayColor,
            opacity: Math.max(0, Math.min(100, overlayOpacity)) / 100,
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
        {eyebrow ? (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-md">
            {eyebrow}
          </span>
        ) : null}
        <div className="absolute inset-x-3 bottom-3">
          <h4 className="font-serif text-[20px] leading-none tracking-tight text-white">
            {label || "—"}
          </h4>
        </div>
      </div>
    </div>
  );
}

function defaultOrderFor(slot: HomeCategorySlot): number {
  switch (slot) {
    case "PERFUMES_HOMBRE":
      return 1;
    case "PERFUMES_MUJER":
      return 2;
    case "JOYAS_ACERO_DORADO":
      return 3;
    case "JOYAS_ACERO_PLATEADO":
      return 4;
    case "JOYAS_BANADAS_ORO":
      return 5;
    case "JOYAS_PLATA":
      return 6;
  }
}
