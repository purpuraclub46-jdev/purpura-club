"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useHomeCategoriesList } from "../hooks/use-home-categories";
import { SLOT_META, SLOT_ORDER } from "../types";
import type { HomeCategoryEntity, HomeCategorySlot } from "../types";
import { HomeCategoryForm } from "./home-category-form";

export function HomeCategoriesManager() {
  const { data, isLoading } = useHomeCategoriesList();
  const [activeSlot, setActiveSlot] = useState<HomeCategorySlot>(
    SLOT_ORDER[0]!,
  );

  const bySlot = useMemo(() => {
    const map = new Map<HomeCategorySlot, HomeCategoryEntity>();
    (data ?? []).forEach((c) => map.set(c.slot, c));
    return map;
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando categorías…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav
        role="tablist"
        aria-label="Slots del carrusel"
        className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1 lg:border-r lg:border-border lg:pr-4"
      >
        {SLOT_ORDER.map((slot) => {
          const meta = SLOT_META[slot];
          const entity = bySlot.get(slot);
          const active = activeSlot === slot;
          const visible = entity?.active ?? true;

          return (
            <button
              key={slot}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSlot(slot)}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/8 text-foreground"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {SLOT_ORDER.indexOf(slot) + 1}
              </span>
              <span className="flex-1 truncate text-left">{meta.label}</span>
              {visible ? (
                <Eye className="size-3.5 shrink-0 text-emerald-600" />
              ) : (
                <EyeOff className="size-3.5 shrink-0 text-muted-foreground/60" />
              )}
            </button>
          );
        })}
      </nav>

      <section
        role="tabpanel"
        aria-labelledby={activeSlot}
        className="space-y-1"
      >
        <header className="flex items-start gap-2 border-b border-border pb-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {SLOT_META[activeSlot].label}
            </h3>
            <p className="text-xs text-muted-foreground">
              {SLOT_META[activeSlot].description}
            </p>
          </div>
        </header>

        <div className="pt-5">
          <HomeCategoryForm
            key={activeSlot}
            slot={activeSlot}
            initial={bySlot.get(activeSlot) ?? null}
          />
        </div>
      </section>
    </div>
  );
}
