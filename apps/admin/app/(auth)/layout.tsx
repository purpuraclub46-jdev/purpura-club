import type { ReactNode } from "react";

/**
 * Layout split-screen para auth. Fondo blanco luxury retail, sin gradientes
 * morados (esos son del dark mode global del admin). El theme dark del resto
 * de la app no se ve afectado — esta sección fuerza tipografía oscura y
 * sólidos para evocar Shopify/Stripe/Notion premium.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] antialiased">
      {children}
    </div>
  );
}
