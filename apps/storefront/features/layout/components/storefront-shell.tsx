"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { WishlistDrawer } from "@/features/wishlist/components/wishlist-drawer";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { TopBar } from "./top-bar";

/**
 * Rutas de autenticación full-screen — no renderizan TopBar/Navbar/Footer/
 * Drawers. Cada página auth controla su propia chrome (back button +
 * logotipo centrado + footer "Púrpura Club") para entregar experiencia
 * tipo aplicación nativa (Apple ID / Airbnb / Stripe Dashboard mobile).
 *
 * Mantenemos el gating aquí (no en una route-group `(auth)`) para no
 * mover archivos existentes ni romper imports relativos — el efecto UX
 * es idéntico.
 */
const AUTH_ROUTES: ReadonlySet<string> = new Set([
  "/login",
  "/register",
  "/recuperar-contrasena",
]);

export function StorefrontShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname ? AUTH_ROUTES.has(pathname) : false;

  if (isAuthRoute) {
    // En rutas auth dejamos los drawers desmontados también — no hay botones
    // del header que los puedan invocar, y los queremos visualmente fuera
    // de la experiencia.
    return <>{children}</>;
  }

  return (
    <>
      <TopBar />
      <Navbar />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <CartDrawer />
      <WishlistDrawer />
    </>
  );
}
