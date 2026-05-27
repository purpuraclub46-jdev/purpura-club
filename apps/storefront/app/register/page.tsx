"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Gift,
  Sparkles,
  Ticket,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentType, type SVGProps } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { extractErrorMessage } from "@/services/http/client";
import { useRegister } from "@/features/auth/hooks/use-auth";
import { toast } from "@/stores/toast.store";
import { useUserMenuStore } from "@/stores/user-menu.store";

/**
 * REGISTER PAGE · luxury ecommerce reference (light edition)
 * ─────────────────────────────────────────────────────────
 * Esta vista es la referencia visual del proyecto para:
 *   · Iconografía: Lucide thin (strokeWidth=1.4)
 *   · Microinteracción: hover scale ultra-leve + transición 200ms
 *   · Motion: framer-motion con stagger suave + easing premium
 *   · Backdrop: editorial light (gradient gris→blanco reinterpretado con
 *     glows púrpura ultra sutiles + grain) — Apple / Aesop / Cartier modern.
 *
 * El "¿Ya tienes cuenta? Inicia sesión" abre el UserMenu del header vía
 * `useUserMenuStore` para mantener UN SOLO login oficial.
 */

const passwordRule = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Incluye al menos una mayúscula")
  .regex(/[0-9]/, "Incluye al menos un número");

const registerSchema = z.object({
  firstName: z.string().min(1, "Tu nombre es obligatorio"),
  lastName: z.string().min(1, "Tu apellido es obligatorio"),
  email: z.string().email("Email inválido"),
  password: passwordRule,
});

type RegisterValues = z.infer<typeof registerSchema>;

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface PerkSpec {
  icon: IconType;
  title: string;
  description: string;
}

const PERKS: readonly PerkSpec[] = [
  {
    icon: Ticket,
    title: "Tickets de sorteos automáticos",
    description: "Cada S/ 25 de compra suma una participación adicional.",
  },
  {
    icon: Gift,
    title: "Descuentos exclusivos",
    description: "Acceso a precios miembro y ofertas privadas.",
  },
  {
    icon: UserPlus,
    title: "Tickets por referidos",
    description: "Invita amigos y gana tickets adicionales automáticamente.",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function RegisterPage() {
  const router = useRouter();
  const reg = useRegister();
  const openLogin = useUserMenuStore((s) => s.open);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reg.mutateAsync(values);
      toast.success("¡Bienvenida al Club Púrpura!");
      router.replace("/mi-cuenta");
    } catch (error) {
      toast.error("No pudimos crear tu cuenta", extractErrorMessage(error));
    }
  });

  return (
    <div className="grid min-h-[calc(100vh-9rem)] lg:grid-cols-[1.1fr_1fr]">
      {/* ─── Branding · editorial light ──────────────────────────────── */}
      <aside className="relative isolate hidden overflow-hidden lg:block">
        <EditorialBackdrop />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          {/* Brand mark */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/images/isotipo.svg"
                alt="Purpura Club"
                width={40}
                height={40}
                className="size-10"
                priority
              />
              <Image
                src="/images/logotipo.svg"
                alt="Purpura Club"
                width={140}
                height={24}
                className="h-5 w-auto"
                priority
              />
            </Link>
          </motion.div>

          {/* Hero copy + perks */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
            }}
            className="space-y-7"
          >
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#9810FA]/15 bg-white/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#0A0A0A]/75 backdrop-blur-md"
            >
              <Sparkles className="size-3 text-[#9810FA]" strokeWidth={1.4} />
              Únete al club
            </motion.span>

            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
              }}
              className="font-serif text-4xl leading-[1.05] tracking-tight text-[#0A0A0A] text-balance sm:text-[44px] xl:text-5xl"
            >
              Aquí comienza tu
              <br />
              experiencia Purpura.
            </motion.h1>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
              }}
              className="max-w-md text-[15px] leading-relaxed text-[#0A0A0A]/65"
            >
              Accede a beneficios exclusivos, tickets para sorteos y
              experiencias únicas dentro del club.
            </motion.p>

            {/* Perks · stagger interno */}
            <motion.ul
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.09, delayChildren: 0.18 },
                },
              }}
              className="space-y-2.5 pt-3"
            >
              {PERKS.map((perk) => (
                <Perk key={perk.title} {...perk} />
              ))}
            </motion.ul>
          </motion.div>

          {/*
            Sin footer corporativo — el panel termina en las cards.
            `justify-between` con 2 hijos (logo + hero) ancla el hero al
            borde inferior; el `p-12 xl:p-16` del contenedor mantiene el
            aire mínimo. Para sumar breathing room editorial sin que las
            cards "besen" el borde, agregamos un offset extra abajo.
          */}
          <div aria-hidden className="h-2 xl:h-6" />
        </div>
      </aside>

      {/* ─── Formulario ──────────────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          className="w-full max-w-md space-y-7"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[#0A0A0A]/55 transition-colors duration-200 hover:text-[#9810FA]"
          >
            <ArrowLeft
              className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5"
              strokeWidth={1.4}
            />
            Volver al inicio
          </Link>

          <div className="space-y-2">
            <Image
              src="/images/isotipo.svg"
              alt="Purpura Club"
              width={48}
              height={48}
              className="size-12 lg:hidden"
            />
            <h2 className="font-serif text-[28px] leading-tight tracking-tight text-[#0A0A0A] sm:text-3xl">
              Crea tu cuenta
            </h2>
            <p className="text-[13px] leading-relaxed text-[#0A0A0A]/55">
              Acumula puntos, gana tickets y vive Purpura Club.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Nombre"
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
                label="Apellido"
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
            </div>

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
                placeholder="tu@correo.com"
                {...register("email")}
              />
            </FormField>

            <FormField
              label="Contraseña"
              htmlFor="password"
              required
              description="Mínimo 8 caracteres, una mayúscula y un número."
              error={errors.password?.message}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[#0A0A0A]/45 transition-colors duration-200 hover:bg-[#11111108] hover:text-[#0A0A0A]"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" strokeWidth={1.4} />
                  ) : (
                    <Eye className="size-4" strokeWidth={1.4} />
                  )}
                </button>
              </div>
            </FormField>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="group w-full text-[12px] tracking-[0.18em] uppercase hover:-translate-y-px hover:shadow-[0_14px_36px_-14px_rgba(152,16,250,0.5)]"
              isLoading={isSubmitting || reg.isPending}
            >
              Crear cuenta
              <ArrowRight
                className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                strokeWidth={1.6}
              />
            </Button>

            <p className="text-center text-[10px] uppercase tracking-[0.22em] text-[#0A0A0A]/45">
              Al registrarte aceptas nuestros términos y políticas.
            </p>
          </form>

          {/*
            "¿Ya tienes cuenta?" — abre el UserMenu del header (login oficial
            único). NO navega a una ruta /login duplicada. El store maneja
            el toggle visual; el header renderiza el panel.
          */}
          <div className="border-t border-[#11111110] pt-4 text-center text-[12px] text-[#0A0A0A]/55">
            ¿Ya tienes cuenta?{" "}
            <button
              type="button"
              onClick={openLogin}
              className="font-medium text-[#9810FA] underline-offset-4 transition-all duration-200 hover:underline"
            >
              Inicia sesión
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/**
 * Backdrop editorial LIGHT — capas:
 *   1. Base: gradiente diagonal gris claro → blanco (interpretación
 *      premium del `linear-gradient(90deg, #a6a6a6, #ffffff)`: en lugar de
 *      gris medio plano usamos #d4d4d8 → #f5f5f7 → #ffffff, con ángulo
 *      ligeramente inclinado para profundidad).
 *   2. Aurora púrpura ultra-tenue superior-derecha (ambient glow).
 *   3. Aurora magenta inferior-izquierda (segunda capa de color).
 *   4. Glow púrpura central (refuerzo de marca, opacidad 4%).
 *   5. Grain fino editorial (ruido sutil para evitar el "plano gris").
 *   6. Vignette al borde derecho (transición suave con el panel del form).
 *
 * Todo CSS-only, GPU-friendly. Sin canvas ni shaders. Sin animaciones
 * en background → cero impacto de performance.
 */
function EditorialBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Base: gradiente diagonal gris claro → blanco */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(118deg, #d4d4d8 0%, #ececef 38%, #f7f7f8 68%, #ffffff 100%)",
        }}
      />

      {/* Aurora púrpura · esquina superior derecha */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 50% at 88% 14%, rgba(152,16,250,0.14) 0%, rgba(152,16,250,0) 70%)",
        }}
      />

      {/* Aurora magenta · esquina inferior izquierda */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 42% at 6% 92%, rgba(192,38,211,0.09) 0%, rgba(192,38,211,0) 75%)",
        }}
      />

      {/* Glow púrpura ultra-suave centrado */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 42%, rgba(152,16,250,0.04) 0%, rgba(255,255,255,0) 70%)",
        }}
      />

      {/* Grain editorial */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.55) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* Vignette al borde derecho — transición suave con el panel blanco */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 75%, rgba(255,255,255,0.6) 100%)",
        }}
      />
    </div>
  );
}

/**
 * Perk card — glass light:
 *   · Borde black/[0.06], fondo white/55 con backdrop-blur-md.
 *   · Hover: lift 1px + glow púrpura tenue + borde sutilmente más vivo.
 *   · Icono dentro de chip con gradient púrpura suave; on hover el chip
 *     se intensifica ligeramente.
 *   · Stagger lo maneja el padre via variants (no duplicar acá).
 *
 * NO sombras duras ni neón. Todo debe leerse editorial sobre el backdrop
 * gris-blanco.
 */
function Perk({
  icon: Icon,
  title,
  description,
}: PerkSpec) {
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="group flex items-start gap-3.5 rounded-2xl border border-black/6 bg-white/55 p-4 backdrop-blur-md ring-1 ring-inset ring-white/40 transition-all duration-300 hover:border-[#9810FA]/20 hover:bg-white/70 hover:shadow-[0_18px_40px_-22px_rgba(152,16,250,0.32)]"
    >
      <span
        aria-hidden
        className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#9810FA]/14 to-[#c026d3]/8 text-[#9810FA] ring-1 ring-inset ring-[#9810FA]/10 transition-all duration-300 group-hover:from-[#9810FA]/22 group-hover:to-[#c026d3]/14 group-hover:ring-[#9810FA]/22"
      >
        <Icon className="size-4" strokeWidth={1.4} />
        {/* Glow interno ultra-tenue al hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 30%, rgba(152,16,250,0.15) 0%, rgba(0,0,0,0) 70%)",
          }}
        />
      </span>
      <div className="space-y-0.5">
        <p className="text-[13.5px] font-medium leading-snug text-[#0A0A0A]">
          {title}
        </p>
        <p className="text-[12px] leading-relaxed text-[#0A0A0A]/60">
          {description}
        </p>
      </div>
    </motion.li>
  );
}
