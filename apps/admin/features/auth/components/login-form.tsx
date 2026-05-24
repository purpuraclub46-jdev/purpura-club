"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/login.schema";
import { useLogin } from "@/features/auth/hooks/use-login";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const login = useLogin();

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
      router.replace(next.startsWith("/") ? next : "/");
    } catch (error) {
      toast.error("No se pudo iniciar sesión", extractErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormField
        label="Correo electrónico"
        htmlFor="email"
        required
        error={errors.email?.message}
      >
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@purpura.club"
            className="pl-9"
            {...register("email")}
          />
        </div>
      </FormField>

      <FormField
        label="Contraseña"
        htmlFor="password"
        required
        error={errors.password?.message}
      >
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-9"
            {...register("password")}
          />
        </div>
      </FormField>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        isLoading={login.isPending}
      >
        Iniciar sesión
      </Button>
    </form>
  );
}
