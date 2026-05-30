"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Package,
  Sparkles,
  Ticket,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/shared/lib/cn";
import { useMediaQuery } from "@/shared/lib/use-media-query";
import { extractErrorMessage } from "@/services/http/client";
import { useAuth, useLogin, useLogout } from "@/features/auth/hooks/use-auth";
import { toast } from "@/stores/toast.store";
import { useUserMenuStore } from "@/stores/user-menu.store";

/**
 * UserMenu — botón del header que abre el panel auth oficial del storefront.
 *
 * Estados:
 *  · Sin sesión → mini login form + acceso a /register + microcopy.
 *  · Con sesión → header del usuario + links a tabs de /mi-cuenta + logout.
 *
 * Responsive:
 *  · Desktop (lg+): floating dropdown anclado al trigger, ancho fijo.
 *  · Mobile (< lg): bottom sheet con backdrop + body scroll lock.
 *
 * El estado `isOpen` vive en `useUserMenuStore` para que cualquier surface
 * (register page, checkout, mi-cuenta sin sesión) pueda invocar `open()`
 * y reutilizar este mismo panel como ÚNICO login oficial — sin duplicar
 * formularios ni rutas /login paralelas.
 */
export function UserMenu() {
  const open = useUserMenuStore((s) => s.isOpen);
  const closeMenu = useUserMenuStore((s) => s.close);
  const toggleMenu = useUserMenuStore((s) => s.toggle);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const logout = useLogout();
  // En mobile el modal/sheet se reemplaza por navegación full-screen
  // (/login si no hay sesión, /mi-cuenta si la hay). Desktop conserva el
  // dropdown floating actual para login rápido sin cambiar de página.
  const isLg = useMediaQuery("(min-width: 1024px)");

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeMenu]);

  // Body scroll lock eliminado: la experiencia mobile ya no usa sheet
  // (migrada a /login full-screen) y el dropdown desktop no requiere lock.

  const handleLogout = async () => {
    closeMenu();
    await logout.mutateAsync();
    router.replace("/");
  };

  /**
   * Trigger principal del header. Desktop conserva el toggle del dropdown
   * (login express sin abandonar la página actual). Mobile salta a la
   * ruta full-screen correspondiente (/login o /mi-cuenta) — sin modal,
   * sin sheet.
   */
  const handleTrigger = () => {
    if (isLg) {
      toggleMenu();
      return;
    }
    if (isAuthenticated) {
      router.push("/mi-cuenta");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTrigger}
        aria-expanded={isLg ? open : undefined}
        aria-haspopup={isLg ? "dialog" : undefined}
        aria-label={
          isAuthenticated ? `Cuenta de ${user?.firstName}` : "Iniciar sesión"
        }
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full transition-colors",
          isAuthenticated
            ? "bg-[#9810FA] text-white hover:bg-[#7c0fcc]"
            : "text-[#0A0A0A] hover:bg-[#11111108]",
        )}
      >
        {isAuthenticated && user ? (
          <span className="text-[11px] font-semibold uppercase tracking-wide">
            {initials(user.firstName, user.lastName)}
          </span>
        ) : (
          <User className="size-5" strokeWidth={1.6} />
        )}
      </button>

      {/*
        El panel SOLO renderiza en desktop (`isLg`). En mobile la experiencia
        auth se entrega como página full-screen (/login, /mi-cuenta) — no
        hay modal/sheet aunque alguna surface llame `openLogin()` con
        herencia. Esto evita regresiones si quedan callers antiguos.
      */}
      <AnimatePresence>
        {open && isLg ? (
          <>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={
                isAuthenticated ? "Panel de cuenta" : "Iniciar sesión"
              }
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "absolute right-0 top-[calc(100%+12px)] z-50 w-85 origin-top-right overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-24px_rgba(17,17,17,0.22)] ring-1 ring-black/5",
              )}
            >
              {isAuthenticated && user ? (
                <AccountPanel
                  firstName={user.firstName}
                  lastName={user.lastName}
                  email={user.email}
                  onClose={closeMenu}
                  onLogout={handleLogout}
                  logoutPending={logout.isPending}
                />
              ) : (
                <LoginPanel onClose={closeMenu} />
              )}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── Mini login form ────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().min(1, "Ingresa tu correo").email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
type LoginValues = z.infer<typeof loginSchema>;

function LoginPanel({ onClose }: { onClose: () => void }) {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

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
      onClose();
    } catch (error) {
      toast.error("No pudimos iniciar sesión", extractErrorMessage(error));
    }
  });

  return (
    <div>
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#0A0A0A]">
          Inicia sesión
        </h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 px-6 pb-4" noValidate>
        <PanelField
          id="user-menu-email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          error={errors.email?.message}
          autoFocus
          {...register("email")}
        />

        <PanelField
          id="user-menu-password"
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="inline-flex size-7 items-center justify-center rounded-full text-[#0A0A0A]/45 transition-colors hover:bg-[#11111108] hover:text-[#0A0A0A]"
            >
              {showPassword ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
            </button>
          }
          {...register("password")}
        />

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-300 ease-out",
            submitting
              ? "cursor-wait bg-[#11111122] text-[#0A0A0A]/55"
              : "bg-[#0A0A0A] text-white hover:-translate-y-px hover:bg-[#9810FA] hover:shadow-[0_12px_28px_-12px_rgba(152,16,250,0.45)] active:translate-y-0",
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Ingresando…
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </form>

      <div className="flex items-center justify-end px-6 pb-5">
        <Link
          href="/register"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9810FA] transition-colors hover:opacity-80"
        >
          Crear cuenta
          <ChevronRight className="size-3" />
        </Link>
      </div>

      <div className="border-t border-black/5 bg-surface-muted px-6 py-4">
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[#0A0A0A]/55">
          <Sparkles
            className="mt-0.5 size-3 shrink-0 text-[#9810FA]"
            strokeWidth={1.8}
          />
          Accede a pedidos, sorteos exclusivos y beneficios Purpura Club.
        </p>
      </div>
    </div>
  );
}

// ─── Account panel (autenticado) ────────────────────────────────────

function AccountPanel({
  firstName,
  lastName,
  email,
  onClose,
  onLogout,
  logoutPending,
}: {
  firstName: string;
  lastName: string;
  email: string;
  onClose: () => void;
  onLogout: () => void | Promise<void>;
  logoutPending: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <div className="flex size-11 items-center justify-center rounded-full bg-[#9810FA] text-[11px] font-semibold uppercase tracking-wide text-white">
          {initials(firstName, lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#0A0A0A]">
            {firstName} {lastName}
          </p>
          <p className="truncate text-[11px] text-[#0A0A0A]/55">{email}</p>
        </div>
      </div>

      <div className="border-t border-black/5 px-2 py-2">
        <AccountLink
          href="/mi-cuenta?tab=perfil"
          icon={User}
          label="Mi cuenta"
          onClick={onClose}
        />
        <AccountLink
          href="/mi-cuenta?tab=pedidos"
          icon={Package}
          label="Pedidos"
          onClick={onClose}
        />
        <AccountLink
          href="/mi-cuenta?tab=sorteos"
          icon={Ticket}
          label="Tickets de sorteos"
          onClick={onClose}
        />
      </div>

      <div className="border-t border-black/5 p-2">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
        >
          {logoutPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" strokeWidth={1.6} />
          )}
          {logoutPending ? "Cerrando…" : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );
}

function AccountLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof User;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#9810FA]/6 hover:text-[#9810FA]"
    >
      <Icon
        className="size-4 text-[#0A0A0A]/55 transition-colors group-hover:text-[#9810FA]"
        strokeWidth={1.6}
      />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-3.5 text-[#0A0A0A]/25 transition-all group-hover:translate-x-0.5 group-hover:text-[#9810FA]/65" />
    </Link>
  );
}

// ─── Premium compact input ──────────────────────────────────────────

interface PanelFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightAdornment?: React.ReactNode;
}

const PanelField = forwardRef<HTMLInputElement, PanelFieldProps>(
  ({ label, error, rightAdornment, id, className, ...inputProps }, ref) => {
    const hasError = Boolean(error);
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={id}
          className="block text-[10px] font-medium uppercase tracking-[0.22em] text-[#0A0A0A]/55"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={cn(
              "h-10 w-full rounded-xl border bg-white px-3.5 text-sm text-[#0A0A0A] transition-colors placeholder:text-[#0A0A0A]/35 focus:outline-none focus:ring-4 focus:ring-[#9810FA]/15",
              hasError
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200/40"
                : "border-black/10 focus:border-[#9810FA]",
              rightAdornment && "pr-10",
              className,
            )}
            {...inputProps}
          />
          {rightAdornment ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {rightAdornment}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="text-[11px] text-rose-600">{error}</p>
        ) : null}
      </div>
    );
  },
);
PanelField.displayName = "PanelField";

// ─── Util ──────────────────────────────────────────────────────────

function initials(firstName: string, lastName: string): string {
  const f = firstName?.trim()?.[0] ?? "";
  const l = lastName?.trim()?.[0] ?? "";
  return (f + l).toUpperCase() || "PC";
}
