"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { extractErrorMessage } from "@/services/http/client";
import {
  AuthAurora,
  AuthCrossLink,
  AuthDivider,
  AuthField,
  AuthFooter,
  AuthHeader,
  AuthInput,
  AuthIntro,
  AuthSubmit,
} from "@/features/auth/components/auth-shell";
import { useAuth, useLogin } from "@/features/auth/hooks/use-auth";
import { toast } from "@/stores/toast.store";

/**
 * /login — Página full-screen de inicio de sesión.
 *
 * Composición editorial usando los building blocks de `auth-shell`:
 *
 *   AuthHeader        → back + logotipo centrado real
 *   AuthAurora        → radial púrpura ultra-fino
 *   AuthIntro         → eyebrow brand + título serif XL + subtítulo
 *   AuthDivider       → hairline brand + hairline neutro (ritmo visual)
 *   AuthField + AuthInput → fields h-12 rounded-xl con focus ring brand
 *   AuthSubmit        → CTA con ArrowRight forward-motion en hover
 *   AuthCrossLink     → puente a /register
 *   AuthFooter        → "Púrpura Club" tracking
 *
 * Reutiliza la lógica auth existente (`useLogin`, `useAuth`, `toast`,
 * zod). Soporta `?next=/ruta` para post-auth redirect con guard
 * anti-open-redirect (solo paths relativos).
 */

const loginSchema = z.object({
  email: z.string().min(1, "Ingresa tu correo").email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type LoginValues = z.infer<typeof loginSchema>;

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, hydrated } = useAuth();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const rawNext = searchParams.get("next");
  // Solo paths relativos del propio storefront — evita open-redirect
  // a dominios externos via ?next=https://...
  const nextHref =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/mi-cuenta";

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace(nextHref);
    }
  }, [hydrated, isAuthenticated, nextHref, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submitting = isSubmitting || login.isPending;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      toast.success("Bienvenida de vuelta");
      router.replace(nextHref);
    } catch (error) {
      toast.error("No pudimos iniciar sesión", extractErrorMessage(error));
    }
  });

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-white">
      <AuthAurora />
      <AuthHeader />

      <main className="relative flex flex-1 flex-col items-center px-5 pt-8 pb-10 sm:px-8 sm:pt-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-md"
        >
          <AuthIntro
            eyebrow="Bienvenido de nuevo"
            title="Inicia sesión en tu cuenta"
            subtitle="Accede a tus pedidos, favoritos y experiencias exclusivas del Club Púrpura."
          />

          <AuthDivider />

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <AuthField
              label="Correo electrónico"
              id="email"
              error={errors.email?.message}
            >
              <AuthInput
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="tu@correo.com"
                autoFocus
                hasError={Boolean(errors.email)}
                {...register("email")}
              />
            </AuthField>

            <AuthField
              label="Contraseña"
              id="password"
              error={errors.password?.message}
            >
              <div className="relative">
                <AuthInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  hasError={Boolean(errors.password)}
                  className="pr-12"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-[#0A0A0A]/45 transition-colors duration-200 hover:bg-[#11111108] hover:text-[#0A0A0A]"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" strokeWidth={1.6} />
                  ) : (
                    <Eye className="size-4" strokeWidth={1.6} />
                  )}
                </button>
              </div>
            </AuthField>

            <div className="flex justify-end pt-1">
              <Link
                href="/recuperar-contrasena"
                className="text-[12.5px] font-medium text-[#0A0A0A]/55 transition-colors duration-200 hover:text-[#9810FA]"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <AuthSubmit submitting={submitting} loadingLabel="Ingresando…">
              Iniciar sesión
            </AuthSubmit>
          </form>

          <AuthCrossLink
            prefix="¿No tienes cuenta?"
            label="Crear cuenta"
            href="/register"
          />
        </motion.div>
      </main>

      <AuthFooter />
    </div>
  );
}
