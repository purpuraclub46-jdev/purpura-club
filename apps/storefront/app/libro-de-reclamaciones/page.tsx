"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Container } from "@/shared/ui/container";
import { FormField } from "@/shared/ui/form-field";
import { Input, Textarea } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { extractErrorMessage } from "@/services/http/client";
import { useSubmitComplaint } from "@/features/complaints/hooks/use-complaints";
import { toast } from "@/stores/toast.store";
import type { ComplaintEntity } from "@/types/api";

/**
 * /libro-de-reclamaciones — Libro de Reclamaciones digital (Peru INDECOPI).
 *
 * Visual: Stripe / Apple / Linear forms — luxury clean, no SUNAT vibe. La
 * legalidad vive en el copy y en la persistencia (folio único correlativo),
 * no en el diseño.
 *
 * Validación client: zod + react-hook-form. Server hace validación
 * adicional (DTO con class-validator + reglas de dominio).
 *
 * Estados de la página:
 *   1. `idle` (default) — formulario visible.
 *   2. `submitted` — mostramos confirmación con folio + resumen + CTA para
 *      volver al inicio o presentar otro reclamo.
 */

const schema = z
  .object({
    firstName: z.string().min(1, "Tu nombre es obligatorio").max(80),
    lastName: z.string().min(1, "Tu apellido es obligatorio").max(80),
    documentType: z.enum(["DNI", "CE", "PASSPORT", "RUC"]),
    documentNumber: z
      .string()
      .min(6, "Mínimo 6 caracteres")
      .max(20, "Máximo 20 caracteres"),
    phone: z
      .string()
      .min(6, "Teléfono inválido")
      .max(30, "Teléfono demasiado largo"),
    email: z.string().email("Correo inválido").max(120),
    address: z.string().min(4, "Dirección incompleta").max(240),
    isMinor: z.boolean().default(false),
    guardianFullName: z.string().max(160).optional(),
    guardianDocument: z.string().max(20).optional(),
    type: z.enum(["RECLAMO", "QUEJA"]),
    subjectType: z.enum(["PRODUCTO", "SERVICIO"]),
    subjectDetail: z.string().min(1, "Indica el producto o servicio").max(200),
    amount: z
      .union([
        z
          .string()
          .transform((v) => (v === "" ? undefined : Number(v)))
          .refine(
            (v) => v === undefined || (!Number.isNaN(v) && v >= 0),
            "Monto inválido",
          ),
        z.number().min(0),
      ])
      .optional(),
    description: z
      .string()
      .min(10, "Mínimo 10 caracteres — describe el caso")
      .max(2000),
    consumerRequest: z
      .string()
      .min(10, "Mínimo 10 caracteres — indica qué solución esperas")
      .max(1000),
  })
  .superRefine((data, ctx) => {
    if (data.isMinor) {
      if (!data.guardianFullName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["guardianFullName"],
          message: "Requerido cuando el consumidor es menor de edad",
        });
      }
      if (!data.guardianDocument?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["guardianDocument"],
          message: "Requerido cuando el consumidor es menor de edad",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LibroDeReclamacionesPage() {
  const [confirmation, setConfirmation] = useState<ComplaintEntity | null>(
    null,
  );

  if (confirmation) {
    return (
      <ConfirmationView
        complaint={confirmation}
        onReset={() => setConfirmation(null)}
      />
    );
  }

  return <ComplaintForm onSuccess={setConfirmation} />;
}

// ─── Form view ────────────────────────────────────────────────────────────

function ComplaintForm({
  onSuccess,
}: {
  onSuccess: (c: ComplaintEntity) => void;
}) {
  const submit = useSubmitComplaint();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      documentType: "DNI",
      type: "RECLAMO",
      subjectType: "PRODUCTO",
      isMinor: false,
    },
  });

  const isMinor = watch("isMinor");

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await submit.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        documentType: values.documentType,
        documentNumber: values.documentNumber,
        phone: values.phone,
        email: values.email,
        address: values.address,
        isMinor: values.isMinor,
        guardianFullName: values.isMinor ? values.guardianFullName : undefined,
        guardianDocument: values.isMinor ? values.guardianDocument : undefined,
        type: values.type,
        subjectType: values.subjectType,
        subjectDetail: values.subjectDetail,
        amount: typeof values.amount === "number" ? values.amount : undefined,
        description: values.description,
        consumerRequest: values.consumerRequest,
      });
      toast.success("Reclamo registrado", `Folio ${created.ticketNumber}`);
      onSuccess(created);
    } catch (error) {
      toast.error(
        "No pudimos registrar tu reclamo",
        extractErrorMessage(error),
      );
    }
  });

  return (
    <div className="bg-white pb-20">
      {/* Hero */}
      <section className="lux-aurora border-b border-[#11111108]">
        <Container className="py-12 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[#0A0A0A]/55 transition-colors hover:text-[#9810FA]"
          >
            <ArrowLeft className="size-3" strokeWidth={1.4} />
            Volver al inicio
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-6 max-w-2xl"
          >
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#9810FA]/15 bg-white/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#0A0A0A]/75 backdrop-blur-md">
              <ShieldCheck
                className="size-3 text-[#9810FA]"
                strokeWidth={1.5}
              />
              INDECOPI · Ley 29571
            </p>
            <h1 className="mt-5 font-serif text-3xl tracking-tight text-[#0A0A0A] sm:text-[44px] sm:leading-[1.05]">
              Libro de Reclamaciones
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#0A0A0A]/65">
              Conforme al Código de Protección y Defensa del Consumidor, Purpura
              Club pone a tu disposición este Libro de Reclamaciones digital.
              Recibirás un folio único y nos comprometemos a responder dentro
              de los 30 días calendario.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Form */}
      <Container className="mt-12 max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-12" noValidate>
          <FormSection
            number="01"
            title="Identificación del consumidor"
            description="Estos datos son confidenciales y solo se usan para resolver tu reclamo."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nombres"
                htmlFor="firstName"
                required
                error={errors.firstName?.message}
              >
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  placeholder="María"
                  {...register("firstName")}
                />
              </FormField>
              <FormField
                label="Apellidos"
                htmlFor="lastName"
                required
                error={errors.lastName?.message}
              >
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  placeholder="Pérez"
                  {...register("lastName")}
                />
              </FormField>
              <FormField
                label="Tipo de documento"
                htmlFor="documentType"
                required
              >
                <Select id="documentType" {...register("documentType")}>
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de extranjería</option>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="RUC">RUC</option>
                </Select>
              </FormField>
              <FormField
                label="Número de documento"
                htmlFor="documentNumber"
                required
                error={errors.documentNumber?.message}
              >
                <Input
                  id="documentNumber"
                  placeholder="76543210"
                  inputMode="numeric"
                  {...register("documentNumber")}
                />
              </FormField>
              <FormField
                label="Teléfono"
                htmlFor="phone"
                required
                error={errors.phone?.message}
              >
                <Input
                  id="phone"
                  autoComplete="tel"
                  placeholder="+51 999 999 999"
                  {...register("phone")}
                />
              </FormField>
              <FormField
                label="Correo electrónico"
                htmlFor="email"
                required
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="maria@correo.com"
                  {...register("email")}
                />
              </FormField>
              <FormField
                label="Dirección"
                htmlFor="address"
                required
                error={errors.address?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="address"
                  autoComplete="street-address"
                  placeholder="Av. Larco 123, Miraflores, Lima"
                  {...register("address")}
                />
              </FormField>
            </div>

            {/* Minor checkbox + conditional fields */}
            <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-[#11111110] bg-[#FAFAFA] p-4">
              <input
                type="checkbox"
                {...register("isMinor")}
                className="mt-0.5 size-4 cursor-pointer accent-[#9810FA]"
              />
              <span className="text-[13px] text-[#0A0A0A]/75">
                El consumidor es menor de edad — completaré los datos del padre,
                madre o tutor.
              </span>
            </label>

            {isMinor ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Nombre del padre / madre / tutor"
                  htmlFor="guardianFullName"
                  required
                  error={errors.guardianFullName?.message}
                >
                  <Input
                    id="guardianFullName"
                    placeholder="Carmen Rosa Pérez"
                    {...register("guardianFullName")}
                  />
                </FormField>
                <FormField
                  label="Documento del tutor"
                  htmlFor="guardianDocument"
                  required
                  error={errors.guardianDocument?.message}
                >
                  <Input
                    id="guardianDocument"
                    placeholder="12345678"
                    inputMode="numeric"
                    {...register("guardianDocument")}
                  />
                </FormField>
              </div>
            ) : null}
          </FormSection>

          <FormSection
            number="02"
            title="Detalle del producto o servicio"
            description="Cuéntanos qué fue lo adquirido y el monto involucrado (si aplica)."
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <FormField label="Tipo" htmlFor="subjectType" required>
                <Select id="subjectType" {...register("subjectType")}>
                  <option value="PRODUCTO">Producto</option>
                  <option value="SERVICIO">Servicio</option>
                </Select>
              </FormField>
              <FormField
                label="Monto reclamado (S/)"
                htmlFor="amount"
                description="Opcional. Solo si aplica."
              >
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="149.90"
                  {...register("amount")}
                />
              </FormField>
              <FormField
                label="Producto / servicio"
                htmlFor="subjectDetail"
                required
                error={errors.subjectDetail?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="subjectDetail"
                  placeholder="Collar Eternidad Acero Dorado (SKU CL-0042)"
                  {...register("subjectDetail")}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection
            number="03"
            title="Naturaleza del reclamo"
            description="Reclamo: disconformidad con el producto/servicio recibido. Queja: malestar respecto a la atención."
          >
            <FormField label="Tipo" htmlFor="type" required>
              <Select id="type" {...register("type")}>
                <option value="RECLAMO">Reclamo</option>
                <option value="QUEJA">Queja</option>
              </Select>
            </FormField>

            <FormField
              label="Detalle del reclamo"
              htmlFor="description"
              required
              error={errors.description?.message}
              description="Sé específico — incluye fechas, números de pedido y cualquier dato relevante."
            >
              <Textarea
                id="description"
                rows={6}
                placeholder="El producto llegó con una pieza rota y no responde el servicio postventa..."
                {...register("description")}
              />
            </FormField>

            <FormField
              label="Pedido del consumidor"
              htmlFor="consumerRequest"
              required
              error={errors.consumerRequest?.message}
              description="¿Qué solución esperas? (devolución, cambio, compensación...)"
            >
              <Textarea
                id="consumerRequest"
                rows={4}
                placeholder="Solicito el reemplazo del producto o la devolución íntegra del monto."
                {...register("consumerRequest")}
              />
            </FormField>
          </FormSection>

          <div className="space-y-4 border-t border-[#11111110] pt-8">
            <p className="text-[12px] leading-relaxed text-[#0A0A0A]/55">
              Al presentar este formulario aceptas que Purpura Club tratará tus
              datos personales con la única finalidad de gestionar tu reclamo y
              dar cumplimiento a la legislación aplicable.
            </p>
            <Button
              type="submit"
              variant="accent"
              size="lg"
              isLoading={isSubmitting || submit.isPending}
              className="group/cta w-full sm:w-auto"
            >
              Presentar reclamo
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5"
                strokeWidth={1.6}
              />
            </Button>
          </div>
        </form>
      </Container>
    </div>
  );
}

// ─── Confirmation view ────────────────────────────────────────────────────

function ConfirmationView({
  complaint,
  onReset,
}: {
  complaint: ComplaintEntity;
  onReset: () => void;
}) {
  return (
    <div className="bg-white pb-20 pt-16 sm:pt-24">
      <Container className="max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className={cn(
            "mx-auto inline-flex size-16 items-center justify-center rounded-full",
            "bg-linear-to-br from-[#9810FA] via-[#7C0CD8] to-[#5B0AAD]",
            "ring-1 ring-white/25 ring-inset",
            "shadow-[0_18px_36px_-14px_rgba(152,16,250,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]",
          )}
        >
          <CheckCircle2 className="size-7 text-white" strokeWidth={1.6} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="mt-6 font-serif text-3xl tracking-tight text-[#0A0A0A] sm:text-4xl"
        >
          Reclamo registrado
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.18 }}
          className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[#0A0A0A]/65"
        >
          Tu solicitud quedó registrada en nuestro Libro de Reclamaciones.
          Guarda este folio — lo usaremos en todas las comunicaciones.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.26 }}
          className={cn(
            "mx-auto mt-7 inline-flex flex-col items-center gap-1 rounded-2xl",
            "border border-[#11111110] bg-[#FAFAFA] px-7 py-5",
          )}
        >
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.32em] text-[#0A0A0A]/45">
            Folio
          </span>
          <span className="font-serif text-2xl font-medium tracking-tight text-[#0A0A0A] tabular-nums sm:text-3xl">
            {complaint.ticketNumber}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.34 }}
          className="mt-10 inline-flex items-center gap-2 rounded-xl border border-[#9810FA]/15 bg-[#9810FA]/4 px-4 py-3 text-left text-[12px] text-[#0A0A0A]/70"
        >
          <Sparkles
            className="size-3.5 shrink-0 text-[#9810FA]"
            strokeWidth={1.5}
          />
          <span>
            Responderemos a <strong>{complaint.email}</strong> dentro de los 30
            días calendario, conforme a la legislación aplicable.
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.42 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/">
            <Button variant="primary" size="md">
              Volver al inicio
            </Button>
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#0A0A0A]/55 transition-colors hover:text-[#9810FA]"
          >
            Presentar otro reclamo
          </button>
        </motion.div>
      </Container>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="font-serif text-[28px] font-light leading-none text-[#0A0A0A]/25 tabular-nums">
          {number}
        </span>
        <div className="space-y-1.5">
          <h2 className="font-serif text-[18px] leading-tight tracking-tight text-[#0A0A0A] sm:text-[22px]">
            {title}
          </h2>
          <p className="text-[12.5px] leading-relaxed text-[#0A0A0A]/55">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-4 pl-0 sm:pl-12">{children}</div>
    </section>
  );
}

const Select = ({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "h-11 w-full rounded-lg border border-[#11111122] bg-white px-4 text-sm text-[#0A0A0A]",
      "transition-colors focus:border-[#9810FA] focus:outline-none focus:ring-2 focus:ring-[#9810FA]/15",
      className,
    )}
    {...props}
  />
);
