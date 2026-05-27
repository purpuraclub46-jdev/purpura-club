import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { QueryProvider } from "@/providers/query-provider";
import { StorefrontShell } from "@/features/layout/components/storefront-shell";
import { Toaster } from "@/shared/ui/toaster";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Purpura Club — Joyas, perfumes y sorteos premium",
    template: "%s · Purpura Club",
  },
  description:
    "Joyas, perfumes y experiencias exclusivas del Club Púrpura. Acumula puntos, participa en sorteos y vive el lujo retail accesible.",
  metadataBase: new URL("https://purpura.club"),
  openGraph: {
    title: "Purpura Club",
    description:
      "Joyas, perfumes y experiencias premium. Acumula puntos, participa en sorteos y disfruta beneficios exclusivos.",
    type: "website",
    locale: "es_PE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-white text-[#0A0A0A]">
        <QueryProvider>
          <StorefrontShell>{children}</StorefrontShell>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
