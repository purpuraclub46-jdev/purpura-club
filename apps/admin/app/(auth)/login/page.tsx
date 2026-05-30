import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* ─── Panel luxury izquierdo ─── */}
      <aside className="relative hidden overflow-hidden bg-white lg:flex lg:flex-col">
        {/* Header marca arriba-izquierda */}
        <header className="relative z-10 flex items-center gap-3 p-10 xl:p-12">
          <Image
            src="/brand/isotipo-nuevo.svg"
            alt=""
            width={36}
            height={36}
            priority
            className="size-9"
          />
          <span className="text-sm font-semibold tracking-tight text-[#0A0A0A]">
            Purpura Club
          </span>
        </header>

        {/* Visual luxury centrado — SVG con object-contain, sin overlays */}
        <div className="relative flex flex-1 items-center justify-center px-10 pb-10 xl:px-16 xl:pb-12">
          <div className="relative aspect-square w-full max-w-md xl:max-w-lg">
            <Image
              src="/images/login-luxury.svg"
              alt="Purpura Club"
              fill
              priority
              sizes="(min-width: 1280px) 32rem, 28rem"
              className="object-contain"
            />
          </div>
        </div>

        {/* Footer copyright */}
        <footer className="relative z-10 px-10 pb-8 text-[11px] text-[#0A0A0A]/45 xl:px-12">
          © {new Date().getFullYear()} Purpura Club — Operación retail premium.
        </footer>
      </aside>

      {/* ─── Panel formulario derecho ─── */}
      <main className="relative flex w-full flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        {/* Header marca en mobile (cuando el panel luxury está oculto) */}
        <div className="flex items-center gap-3 lg:hidden">
          <Image
            src="/brand/isotipo-nuevo.svg"
            alt=""
            width={36}
            height={36}
            priority
            className="size-9"
          />
          <span className="text-sm font-semibold tracking-tight text-[#0A0A0A]">
            Purpura Club
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="space-y-2 pb-8 text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#9810FA]">
                Consola Purpura
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0A0A0A]">
                Bienvenido a Purpura Club
              </h1>
              <p className="text-sm text-[#0A0A0A]/60">
                Inicia sesión para continuar.
              </p>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>

            <p className="mt-8 text-center text-[11px] text-[#0A0A0A]/50">
              ¿Problemas para acceder? Contacta a tu administrador de sucursal.
            </p>
          </div>
        </div>

        {/* Footer global créditos */}
        <footer className="pt-6 text-center text-[11px] text-[#0A0A0A]/50">
          Desarrollado por{" "}
          <Link
            href="https://www.agencia-jdev.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#0A0A0A]/70 underline-offset-4 transition-colors hover:text-[#9810FA] hover:underline"
          >
            Agencia JDev
          </Link>
        </footer>
      </main>
    </div>
  );
}
