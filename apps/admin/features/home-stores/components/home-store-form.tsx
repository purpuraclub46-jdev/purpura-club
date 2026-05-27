"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { FormField } from "@/shared/ui/form-field";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  homeStoreSchema,
  type HomeStoreFormValues,
} from "../schemas/home-store.schema";
import {
  useCreateHomeStore,
  useUpdateHomeStore,
} from "../hooks/use-home-stores";
import type {
  CreateHomeStorePayload,
  HomeStoreEntity,
  UpdateHomeStorePayload,
} from "../types";

interface HomeStoreFormProps {
  initial?: HomeStoreEntity;
  mode: "create" | "edit";
}

const toPayload = (values: HomeStoreFormValues): CreateHomeStorePayload => ({
  name: values.name,
  city: values.city,
  address: values.address,
  reference: values.reference || undefined,
  whatsapp: values.whatsapp || undefined,
  schedule: values.schedule || undefined,
  mapsUrl: values.mapsUrl || undefined,
  imageDesktop: values.imageDesktop || undefined,
  imageMobile: values.imageMobile || undefined,
  sortOrder: values.sortOrder,
  active: values.active,
});

export function HomeStoreForm({ initial, mode }: HomeStoreFormProps) {
  const router = useRouter();
  const createMutation = useCreateHomeStore();
  const updateMutation = useUpdateHomeStore(initial?.id ?? "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HomeStoreFormValues>({
    resolver: zodResolver(homeStoreSchema),
    defaultValues: {
      name: initial?.name ?? "",
      city: initial?.city ?? "",
      address: initial?.address ?? "",
      reference: initial?.reference ?? "",
      whatsapp: initial?.whatsapp ?? "",
      schedule: initial?.schedule ?? "",
      mapsUrl: initial?.mapsUrl ?? "",
      imageDesktop: initial?.imageDesktop ?? "",
      imageMobile: initial?.imageMobile ?? "",
      sortOrder: initial?.sortOrder ?? 0,
      active: initial?.active ?? true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(toPayload(values));
        toast.success("Tienda creada");
        router.push(`/tiendas-home/${created.id}`);
      } else if (initial) {
        await updateMutation.mutateAsync(
          toPayload(values) as UpdateHomeStorePayload,
        );
        toast.success("Tienda actualizada");
      }
    } catch (error) {
      toast.error("No se pudo guardar", extractErrorMessage(error));
    }
  });

  const active = watch("active");
  const imageDesktop = watch("imageDesktop");
  const imageMobile = watch("imageMobile");

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* Estado y orden */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={active}
            onCheckedChange={(v) =>
              setValue("active", v, { shouldDirty: true })
            }
            aria-label="Tienda visible"
          />
          <Label className="cursor-pointer">
            {active ? (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Eye className="size-3.5" /> Visible en el storefront
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
            htmlFor="sortOrder"
            error={errors.sortOrder?.message}
          >
            <Input
              id="sortOrder"
              type="number"
              min={0}
              max={999}
              {...register("sortOrder", { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </div>

      {/* Identidad */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Nombre de la tienda"
          htmlFor="name"
          required
          error={errors.name?.message}
        >
          <Input
            id="name"
            {...register("name")}
            placeholder="Plaza del Sol — Ica"
          />
        </FormField>
        <FormField
          label="Ciudad"
          htmlFor="city"
          required
          error={errors.city?.message}
        >
          <Input id="city" {...register("city")} placeholder="Ica" />
        </FormField>
      </div>

      <FormField
        label="Dirección"
        htmlFor="address"
        required
        error={errors.address?.message}
      >
        <Input
          id="address"
          {...register("address")}
          placeholder="Av. Cutervo 132"
        />
      </FormField>

      <FormField
        label="Referencia"
        htmlFor="reference"
        description="Ubicación adicional (opcional). Ej: 'Frente al parque central'."
        error={errors.reference?.message}
      >
        <Input id="reference" {...register("reference")} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="WhatsApp"
          htmlFor="whatsapp"
          description="Incluye código país. Ej: +51999111222"
          error={errors.whatsapp?.message}
        >
          <Input
            id="whatsapp"
            {...register("whatsapp")}
            placeholder="+51999111222"
          />
        </FormField>
        <FormField
          label="Horario de atención"
          htmlFor="schedule"
          description="Texto libre. Ej: 'Lun a sáb · 10:00 – 22:00'"
          error={errors.schedule?.message}
        >
          <Input
            id="schedule"
            {...register("schedule")}
            placeholder="Lun a sáb · 10:00 – 22:00"
          />
        </FormField>
      </div>

      <FormField
        label="URL de Google Maps"
        htmlFor="mapsUrl"
        description='Link que abre "Cómo llegar" en una nueva pestaña.'
        error={errors.mapsUrl?.message}
      >
        <Textarea
          id="mapsUrl"
          rows={2}
          {...register("mapsUrl")}
          placeholder="https://maps.app.goo.gl/..."
          className="font-mono text-xs"
        />
      </FormField>

      {/* Imágenes */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Imagen desktop (URL HTTPS)"
          htmlFor="imageDesktop"
          description="Composición horizontal/cuadrada."
          error={errors.imageDesktop?.message}
        >
          <Input
            id="imageDesktop"
            type="url"
            {...register("imageDesktop")}
            placeholder="https://…/boutique-desktop.jpg"
          />
          {imageDesktop ? (
            <ImagePreview src={imageDesktop} ratio="horizontal" />
          ) : null}
        </FormField>
        <FormField
          label="Imagen mobile (URL HTTPS)"
          htmlFor="imageMobile"
          description="Crop vertical. NO reutilices el asset desktop."
          error={errors.imageMobile?.message}
        >
          <Input
            id="imageMobile"
            type="url"
            {...register("imageMobile")}
            placeholder="https://…/boutique-mobile.jpg"
          />
          {imageMobile ? (
            <ImagePreview src={imageMobile} ratio="vertical" />
          ) : null}
        </FormField>
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
          {mode === "create" ? "Crear tienda" : "Guardar cambios"}
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
  ratio: "horizontal" | "vertical";
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Vista previa"
        className={
          ratio === "vertical"
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
