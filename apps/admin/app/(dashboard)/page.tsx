import Link from "next/link";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { OverviewCards } from "@/features/dashboard/components/overview-cards";
import { UpcomingRaffles } from "@/features/dashboard/components/upcoming-raffles";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      {/* ─── Hero premium ─── */}
      <section className="lux-aurora overflow-hidden rounded-2xl border border-[#11111111] bg-white px-6 py-8 sm:px-8 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3 md:max-w-xl">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
              <span className="inline-block size-1.5 rounded-full bg-[#9810FA]" />
              Consola Purpura
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#0A0A0A] sm:text-[32px]">
              Bienvenido de vuelta.
            </h1>
            <p className="text-sm leading-relaxed text-[#0A0A0A]/60">
              Estado en tiempo real de sorteos, participaciones y pagos.
              Gestiona el catálogo, la operación retail y la membresía Purpura
              Club desde aquí.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/sorteos">
                <Sparkles className="size-4" /> Ver sorteos
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sorteos/nuevo">
                <Plus className="size-4" /> Nuevo sorteo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <OverviewCards />
      <UpcomingRaffles />
    </>
  );
}
