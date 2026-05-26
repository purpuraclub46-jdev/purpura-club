"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { userHasAnyPermission } from "@/stores/auth.store";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/login.schema";
import { useLogin } from "@/features/auth/hooks/use-login";

const ADMIN_PERMISSIONS = [
  "users.view",
  "rbac.manage",
  "reports.view",
] as const;

/**
 * Form luxury retail blanco. Mantiene exactamente la misma lógica RBAC:
 *  - Bloquea login no admin/super_admin
 *  - Respeta ?next= si es un path interno
 *  - Cajero puro (sin permisos admin) → /pos
 *  - Resto → / (dashboard)
 *
 * Solo cambia la presentación: split-screen, fondo blanco, inputs con
 * borde sutil y focus morado, toggle show/hide password.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync(values);
      if (
        result.user.role !== "ADMIN" &&
        result.user.role !== "SUPER_ADMIN"
      ) {
        toast.error(
          "Acceso denegado",
          "Esta cuenta no tiene permisos de administrador.",
        );
        return;
      }
      toast.success(
        "Bienvenido de vuelta",
        `Sesión iniciada como ${result.user.email}`,
      );
      // Si vienen de un deep-link válido, respetarlo.
      if (next && next.startsWith("/")) {
        router.replace(next);
        return;
      }
      // Cajero puro (sin permisos administrativos) → directo al POS.
      const isAdmin = userHasAnyPermission(result.user, ADMIN_PERMISSIONS);
      router.replace(isAdmin ? "/" : "/pos");
    } catch (error) {
      toast.error("No se pudo iniciar sesión", extractErrorMessage(error));
    }
  });

  const isPending = login.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <LuxField
        id="email"
        label="Correo electrónico"
        error={errors.email?.message}
        icon={<Mail className="size-4" />}
      >
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          disabled={isPending}
          className={inputClasses(Boolean(errors.email))}
          {...register("email")}
        />
      </LuxField>

      <LuxField
        id="password"
        label="Contraseña"
        error={errors.password?.message}
        icon={<Lock className="size-4" />}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="grid h-full place-items-center px-3 text-[#0A0A0A]/40 transition-colors hover:text-[#0A0A0A] focus:outline-none focus-visible:text-[#9810FA]"
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        }
      >
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={isPending}
          className={cn(inputClasses(Boolean(errors.password)), "pr-11")}
          {...register("password")}
        />
      </LuxField>

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg",
          "bg-[#9810FA] text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(152,16,250,0.65)]",
          "transition-all duration-200",
          "hover:bg-[#8A0EE0] hover:shadow-[0_12px_32px_-12px_rgba(152,16,250,0.8)]",
          "active:scale-[0.99]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9810FA] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "disabled:cursor-not-allowed disabled:opacity-70",
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Iniciando sesión…
          </>
        ) : (
          <>
            Iniciar sesión
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────

interface LuxFieldProps {
  id: string;
  label: string;
  error?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

function LuxField({ id, label, error, icon, trailing, children }: LuxFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[#0A0A0A]/80"
      >
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0A0A]/40">
            {icon}
          </span>
        ) : null}
        {children}
        {trailing ? (
          <span className="absolute inset-y-0 right-0">{trailing}</span>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-[#E11D48]">{error}</p>
      ) : null}
    </div>
  );
}

const inputClasses = (hasError: boolean): string =>
  cn(
    "block h-12 w-full rounded-lg bg-white pl-10 pr-3 text-sm text-[#0A0A0A] placeholder:text-[#0A0A0A]/35",
    "border transition-colors duration-150",
    "focus:outline-none focus:ring-4",
    hasError
      ? "border-[#E11D48] focus:border-[#E11D48] focus:ring-[#E11D48]/15"
      : "border-[#0A0A0A]/15 hover:border-[#0A0A0A]/30 focus:border-[#9810FA] focus:ring-[#9810FA]/15",
    "disabled:cursor-not-allowed disabled:opacity-60",
  );
