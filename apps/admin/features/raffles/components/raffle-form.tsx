"use client";

import { useRouter } from "next/navigation";
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
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { toDateInputValue } from "@/shared/lib/format";
import {
  raffleSchema,
  type RaffleFormValues,
} from "@/features/raffles/schemas/raffle.schema";
import {
  useCreateRaffle,
  useUpdateRaffle,
} from "@/features/raffles/hooks/use-raffle-mutations";
import type {
  CreateRafflePayload,
  RaffleEntity,
  UpdateRafflePayload,
} from "@/features/raffles/types";

interface RaffleFormProps {
  initial?: RaffleEntity;
  mode: "create" | "edit";
}

const toPayload = (values: RaffleFormValues): CreateRafflePayload => ({
  title: values.title,
  slug: values.slug || undefined,
  description: values.description,
  bannerImage: values.bannerImage || undefined,
  prizeImage: values.prizeImage || undefined,
  countdown: values.countdown
    ? new Date(values.countdown).toISOString()
    : undefined,
  ticketPrice: values.ticketPrice,
  memberTicketPrice: values.memberTicketPrice,
  totalTickets: values.totalTickets,
  startDate: new Date(values.startDate).toISOString(),
  endDate: new Date(values.endDate).toISOString(),
  status: values.status,
  visibility: values.visibility,
});

export function RaffleForm({ initial, mode }: RaffleFormProps) {
  const router = useRouter();
  const createMutation = useCreateRaffle();
  const updateMutation = useUpdateRaffle(initial?.id ?? "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RaffleFormValues>({
    resolver: zodResolver(raffleSchema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      bannerImage: initial?.bannerImage ?? "",
      prizeImage: initial?.prizeImage ?? "",
      countdown: toDateInputValue(initial?.countdown) || "",
      ticketPrice: initial?.ticketPrice ?? 0,
      memberTicketPrice: initial?.memberTicketPrice ?? 0,
      totalTickets: initial?.totalTickets ?? 100,
      startDate: toDateInputValue(initial?.startDate) || "",
      endDate: toDateInputValue(initial?.endDate) || "",
      status: initial?.status ?? "DRAFT",
      visibility: initial?.visibility ?? "PUBLIC",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(toPayload(values));
        toast.success("Sorteo creado");
        router.push(`/sorteos/${created.id}`);
      } else if (initial) {
        await updateMutation.mutateAsync(
          toPayload(values) as UpdateRafflePayload,
        );
        toast.success("Sorteo actualizado");
      }
    } catch (error) {
      toast.error("No se pudo guardar", extractErrorMessage(error));
    }
  });

  const status = watch("status");
  const visibility = watch("visibility");

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Título"
          htmlFor="title"
          required
          error={errors.title?.message}
        >
          <Input
            id="title"
            {...register("title")}
            placeholder="Sorteo iPhone 15 Pro"
          />
        </FormField>

        <FormField
          label="Slug"
          htmlFor="slug"
          description="Identificador para la URL. Se genera automáticamente si lo dejas vacío."
          error={errors.slug?.message}
        >
          <Input
            id="slug"
            {...register("slug")}
            placeholder="sorteo-iphone-15-pro"
          />
        </FormField>
      </div>

      <FormField
        label="Descripción"
        htmlFor="description"
        required
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          rows={6}
          {...register("description")}
          placeholder="Detalle del premio, condiciones del sorteo y mecánica…"
        />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="URL del banner"
          htmlFor="bannerImage"
          error={errors.bannerImage?.message}
        >
          <Input
            id="bannerImage"
            type="url"
            {...register("bannerImage")}
            placeholder="https://…"
          />
        </FormField>
        <FormField
          label="URL del premio"
          htmlFor="prizeImage"
          error={errors.prizeImage?.message}
        >
          <Input
            id="prizeImage"
            type="url"
            {...register("prizeImage")}
            placeholder="https://…"
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Precio público (PEN)"
          htmlFor="ticketPrice"
          required
          error={errors.ticketPrice?.message}
        >
          <Input
            id="ticketPrice"
            type="number"
            step="0.01"
            min={0}
            {...register("ticketPrice", { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Precio miembro (PEN)"
          htmlFor="memberTicketPrice"
          required
          description="Precio con descuento para miembros Púrpura Club."
          error={errors.memberTicketPrice?.message}
        >
          <Input
            id="memberTicketPrice"
            type="number"
            step="0.01"
            min={0}
            {...register("memberTicketPrice", { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Total de tickets"
          htmlFor="totalTickets"
          required
          error={errors.totalTickets?.message}
        >
          <Input
            id="totalTickets"
            type="number"
            min={1}
            {...register("totalTickets", { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Fecha de inicio"
          htmlFor="startDate"
          required
          error={errors.startDate?.message}
        >
          <Input
            id="startDate"
            type="datetime-local"
            {...register("startDate")}
          />
        </FormField>
        <FormField
          label="Fecha de fin"
          htmlFor="endDate"
          required
          error={errors.endDate?.message}
        >
          <Input id="endDate" type="datetime-local" {...register("endDate")} />
        </FormField>
        <FormField
          label="Countdown"
          htmlFor="countdown"
          description="Hora final del temporizador público (opcional)."
          error={errors.countdown?.message}
        >
          <Input
            id="countdown"
            type="datetime-local"
            {...register("countdown")}
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Estado" error={errors.status?.message}>
          <Select
            value={status}
            onValueChange={(v) =>
              setValue("status", v as RaffleFormValues["status"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="PUBLISHED">Publicado</SelectItem>
              <SelectItem value="CLOSED">Cerrado</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Visibilidad" error={errors.visibility?.message}>
          <Select
            value={visibility}
            onValueChange={(v) =>
              setValue("visibility", v as RaffleFormValues["visibility"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">Público</SelectItem>
              <SelectItem value="PRIVATE">Privado</SelectItem>
            </SelectContent>
          </Select>
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
          {mode === "create" ? "Crear sorteo" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
