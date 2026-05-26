"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ScanLine, ShieldOff, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PosShell } from "@/features/pos/components/pos-shell";
import { usePosBootstrap } from "@/features/pos/hooks/use-pos";

export default function PosEntryPage() {
  const router = useRouter();
  const { data, isLoading, isError } = usePosBootstrap();

  // Si el usuario tiene UNA sola sucursal, redirige automáticamente.
  useEffect(() => {
    if (!data) return;
    if (data.availableLocations.length === 1) {
      router.replace(`/pos/${data.availableLocations[0].slug}`);
    }
  }, [data, router]);

  return (
    <PosShell>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={ShieldOff}
              title="Sin acceso al POS"
              description="Tu usuario no tiene permiso para operar el POS o no está asignado a una sucursal."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
              Selecciona terminal
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A] sm:text-[28px]">
              ¿Dónde vas a operar?
            </h1>
            <p className="text-sm text-[#0A0A0A]/55">
              Elige la sucursal para abrir el punto de venta y la caja.
            </p>
          </div>

          {(data?.availableLocations ?? []).length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={ScanLine}
                  title="Sin sucursales asignadas"
                  description="Pídele a un SUPER_ADMIN que te asigne una sucursal para poder operar el POS."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.availableLocations ?? []).map((loc) => (
                <Link key={loc.id} href={`/pos/${loc.slug}`} className="group">
                  <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[#9810FA]/30 group-hover:shadow-[0_18px_36px_-18px_rgba(152,16,250,0.35)]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-[#0A0A0A]">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-[#9810FA]/10 text-[#9810FA] transition-colors group-hover:bg-[#9810FA]/15">
                          <Store className="size-4" />
                        </span>
                        {loc.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#0A0A0A]/55">Tipo</span>
                        <span className="text-[#0A0A0A]/80">{loc.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#0A0A0A]/55">Cajas</span>
                        <span className="tabular-nums text-[#0A0A0A]/80">
                          {loc.cashRegistersCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#0A0A0A]/55">Caja activa</span>
                        {loc.activeSessionId ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Abierta
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#0A0A0A]/5 px-2 py-0.5 text-[10px] font-medium text-[#0A0A0A]/55">
                            Cerrada
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </PosShell>
  );
}
