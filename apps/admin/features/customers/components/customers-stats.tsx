"use client";

import { Crown, TrendingUp, UserCheck, Users, UserX } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import type { CustomerOverviewStats } from "../types";

interface Props {
  data?: CustomerOverviewStats;
  isLoading?: boolean;
}

interface StatCard {
  label: string;
  value: number | string;
  icon: typeof Users;
  hint?: string;
  tone?: "default" | "success" | "warning";
}

export function CustomersStats({ data, isLoading }: Props) {
  const cards: StatCard[] = [
    {
      label: "Clientes totales",
      value: data?.total ?? 0,
      icon: Users,
    },
    {
      label: "Activos",
      value: data?.active ?? 0,
      icon: UserCheck,
      hint: data?.inactive
        ? `${data.inactive} desactivados`
        : undefined,
      tone: "success",
    },
    {
      label: "Miembros",
      value: data?.members ?? 0,
      icon: Crown,
      tone: "default",
    },
    {
      label: "Altas (30 días)",
      value: data?.registeredLast30Days ?? 0,
      icon: TrendingUp,
      tone: "warning",
    },
  ];

  void UserX;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {isLoading ? "—" : c.value}
                </p>
                {c.hint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
                ) : null}
              </div>
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  c.tone === "success"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : c.tone === "warning"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-primary/15 text-primary",
                )}
              >
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
