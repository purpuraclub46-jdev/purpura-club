"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { FormField } from "@/shared/ui/form-field";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
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
  homeBannerSchema,
  type HomeBannerFormValues,
} from "../schemas/home-banner.schema";
import { useUpdateHomeBanner } from "../hooks/use-home-banners";
import { SLOT_META } from "../types";
import type {
  HomeBannerEntity,
  HomeBannerSlot,
  UpdateHomeBannerPayload,
} from "../types";

interface HomeBannerFormProps {
  slot: HomeBannerSlot;
  initial: HomeBannerEntity | null;
}

const toPayload = (values: HomeBannerFormValues): UpdateHomeBannerPayload => ({
  order: values.order,
  active: values.active,
  eyebrow: values.eyebrow || undefined,
  title: values.title,
  subtitle: values.subtitle || undefined,
  ctaLabel: values.ctaLabel,
  ctaHref: values.ctaHref,
  imageDesktop: values.imageDesktop || undefined,
  imageMobile: values.imageMobile || undefined,
  overlayColor: values.overlayColor,
  overlayOpacity: values.overlayOpacity,
  align: values.align,
});

export function HomeBannerForm({ slot, initial }: HomeBannerFormProps) {
  const meta = SLOT_META[slot];
  const updateMutation = useUpdateHomeBanner(slot);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<HomeBannerFormValues>({
    resolver: zodResolver(homeBannerSchema),
    defaultValues: {
      order: initial?.order ?? defaultOrderFor(slot),
      active: initial?.active ?? slot !== "FLEXIBLE",
      eyebrow: initial?.eyebrow ?? meta.defaultEyebrow,
      title: initial?.title ?? "",
      subtitle: initial?.subtitle ?? "",
      ctaLabel: initial?.ctaLabel ?? meta.defaultCtaLabel,
      ctaHref: initial?.ctaHref ?? meta.defaultCtaHref,
      imageDesktop: initial?.imageDesktop ?? "",
      imageMobile: initial?.imageMobile ?? "",
      overlayColor: initial?.overlayColor ?? "#0A0A0A",
      overlayOpacity: initial?.overlayOpacity ?? 45,
      align: initial?.align ?? defaultAlignFor(slot),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(toPayload(values));
      toast.success("Banner actualizado");
    } catch (error) {
      toast.error("No se pudo guardar", extractErrorMessage(error));
    }
  });

  const align = watch("align");
  const active = watch("active");
  const overlayColor = watch("overlayColor");
  const overlayOpacity = watch("overlayOpacity");
  const imageDesktop = watch("imageDesktop");
  const imageMobile = watch("imageMobile");

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
            disabled={!meta.hideable && active}
            aria-label="Banner activo"
          />
          <div>
            <Label className="cursor-pointer">
              {active ? (
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Eye className="size-3.5" /> Visible en el storefront
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <EyeOff className="size-3.5" /> Oculto
                </span>
              )}
            </Label>
            {!meta.hideable ? (
              <p className="text-[10px] text-muted-foreground">
                Slot fijo — solo el banner flexible puede ocultarse.
              </p>
            ) : null}
          </div>
        </div>

        <div className="w-24">
          <FormField
            label="Orden"
            htmlFor={`${slot}-order`}
            error={errors.order?.message}
          >
            <Input
              id={`${slot}-order`}
              type="number"
              min={0}
              max={99}
              {...register("order", { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </div>

      {/* ─── Texto ─── */}
      <div className="space-y-4">
        <FormField
          label="Eyebrow"
          htmlFor={`${slot}-eyebrow`}
          description="Pre-título corto (mayúsculas en el render)."
          error={errors.eyebrow?.message}
        >
          <Input
            id={`${slot}-eyebrow`}
            {...register("eyebrow")}
            placeholder={meta.defaultEyebrow}
          />
        </FormField>

        <FormField
          label="Título"
          htmlFor={`${slot}-title`}
          required
          error={errors.title?.message}
        >
          <Input
            id={`${slot}-title`}
            {...register("title")}
            placeholder="El detalle que distingue"
          />
        </FormField>

        <FormField
          label="Subtítulo"
          htmlFor={`${slot}-subtitle`}
          description="Frase descriptiva debajo del título (opcional)."
          error={errors.subtitle?.message}
        >
          <Textarea
            id={`${slot}-subtitle`}
            rows={3}
            {...register("subtitle")}
            placeholder="Piezas seleccionadas para el detalle que distingue."
          />
        </FormField>
      </div>

      {/* ─── CTA ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Texto del botón"
          htmlFor={`${slot}-ctaLabel`}
          required
          error={errors.ctaLabel?.message}
        >
          <Input
            id={`${slot}-ctaLabel`}
            {...register("ctaLabel")}
            placeholder={meta.defaultCtaLabel}
          />
        </FormField>
        <FormField
          label="Destino del botón"
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
      </div>

      {/* ─── Imágenes ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Imagen desktop (URL)"
          htmlFor={`${slot}-imageDesktop`}
          description="Composición horizontal. HTTPS."
          error={errors.imageDesktop?.message}
        >
          <Input
            id={`${slot}-imageDesktop`}
            type="url"
            {...register("imageDesktop")}
            placeholder="https://…/banner-desktop.jpg"
          />
          {imageDesktop ? (
            <ImagePreview src={imageDesktop} variant="desktop" />
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
            placeholder="https://…/banner-mobile.jpg"
          />
          {imageMobile ? (
            <ImagePreview src={imageMobile} variant="mobile" />
          ) : null}
        </FormField>
      </div>

      {/* ─── Overlay + alineación ─── */}
      <div className="grid gap-4 md:grid-cols-3">
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
          description="Mayor opacidad = imagen más oscura, texto más legible."
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

        <FormField label="Alineación del texto" error={errors.align?.message}>
          <Select
            value={align}
            onValueChange={(v) =>
              setValue("align", v as HomeBannerFormValues["align"], {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LEFT">Izquierda</SelectItem>
              <SelectItem value="CENTER">Centro</SelectItem>
              <SelectItem value="RIGHT">Derecha</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
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
  variant,
}: {
  src: string;
  variant: "desktop" | "mobile";
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Vista previa"
        className={
          variant === "mobile"
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

function defaultOrderFor(slot: HomeBannerSlot): number {
  switch (slot) {
    case "JEWELRY":
      return 1;
    case "PERFUME":
      return 2;
    case "RAFFLE":
      return 3;
    case "FLEXIBLE":
      return 4;
  }
}

function defaultAlignFor(slot: HomeBannerSlot): HomeBannerFormValues["align"] {
  if (slot === "PERFUME") return "RIGHT";
  if (slot === "FLEXIBLE") return "CENTER";
  return "LEFT";
}
