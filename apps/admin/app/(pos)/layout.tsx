import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PosGuard } from "@/providers/pos-guard";

export const metadata: Metadata = {
  title: {
    default: "Purpura POS",
    template: "%s · Purpura POS",
  },
  description:
    "Terminal de punto de venta Purpura Club — operación retail multi-sucursal.",
  applicationName: "Purpura POS",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
  initialScale: 1,
  maximumScale: 1,
  width: "device-width",
};

/**
 * POS standalone — comparte el theme light luxury del admin. Heredamos los
 * tokens light por defecto y reforzamos un canvas blanco para que las
 * superficies (cards, dialogs, tablas) se sientan coherentes con el resto
 * de la consola Purpura Club. No usa wrapper `.theme-dark`.
 */
export default function PosRootLayout({ children }: { children: ReactNode }) {
  return (
    <PosGuard>
      <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A]">{children}</div>
    </PosGuard>
  );
}
