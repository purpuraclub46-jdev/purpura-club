"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useForgotPassword } from "@/features/auth/hooks/use-auth";

/**
 * /recuperar-contrasena — Página full-screen para reset de contraseña.
 *
 * Comparte EXACTAMENTE el mismo lenguaje visual que /login: misma
 * AuthHeader, AuthAurora, AuthFooter, AuthIntro, AuthDivider, AuthField,
 * AuthInput, AuthSubmit, AuthCrossLink. Cero divergencia visual entre
 * ambas pantallas — el usuario percibe una experiencia auth unificada.
 *
 * Por seguridad mostramos un mensaje genérico tras enviar — evitamos
 * account enumeration (no confirmamos si el correo existe o no).
 */

const schema = z.object({
  email: z.string().min(1, "Ingresa tu correo").email("Email inválido"),
});

type Values = z.infer<typeof schema>;

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const submitting = isSubmitting || forgot.isPending;

  const onSubmit = handleSubmit(async (values) => {
    // Genérico por diseño — independientemente del resultado del backend
    // mostramos siempre el mismo mensaje (anti-enumeration). El catch
    // silencia errores de red para no revelar señales al atacante.
    try {
      await forgot.mutateAsync(values);
    } catch {
      /* swallow — anti-enumeration */
    }
    setSubmitted(true);
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
          {submitted ? (
            <ConfirmationView />
          ) : (
            <>
              <AuthIntro
                eyebrow="Restablecer acceso"
                title="Recupera tu contraseña"
                subtitle="Ingresa tu correo y te enviaremos instrucciones para restablecer el acceso a tu cuenta."
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

                <AuthSubmit submitting={submitting} loadingLabel="Enviando…">
                  Enviar instrucciones
                </AuthSubmit>
              </form>

              <AuthCrossLink
                prefix="¿Recordaste tu contraseña?"
                label="Inicia sesión"
                href="/login"
              />
            </>
          )}
        </motion.div>
      </main>

      <AuthFooter />
    </div>
  );
}

/**
 * Vista de confirmación — mismo lenguaje editorial (eyebrow brand +
 * título serif). Reutiliza `AuthIntro` para que la pantalla post-submit
 * no rompa la consistencia visual con el resto del flow.
 *
 * El check decorativo es minimal — hairline morado + check inline. Cero
 * iconos circulares grandes (que se sentirían tipo SaaS toast).
 */
function ConfirmationView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <AuthIntro
        eyebrow="Instrucciones enviadas"
        title="Revisa tu correo"
        subtitle={
          <>
            Si tu correo está registrado en Púrpura Club, recibirás un
            mensaje con los pasos para restablecer tu contraseña. Revisa
            también la carpeta de spam o promociones.
          </>
        }
      />

      <AuthDivider />

      <Link
        href="/login"
        className="group/back inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-[#0A0A0A] text-[14px] font-semibold tracking-tight text-white transition-all duration-300 ease-out hover:-translate-y-px hover:bg-[#9810FA] hover:shadow-[0_20px_40px_-20px_rgba(152,16,250,0.5)] active:translate-y-0"
      >
        <span>Volver al inicio de sesión</span>
        <ArrowRight
          className="size-4 transition-transform duration-300 ease-out group-hover/back:translate-x-1"
          strokeWidth={1.6}
        />
      </Link>
    </motion.div>
  );
}
