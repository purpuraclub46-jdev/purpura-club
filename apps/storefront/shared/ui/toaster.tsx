"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore } from "@/stores/toast.store";
import { cn } from "@/shared/lib/cn";

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const TONES = {
  success: "border-emerald-200 bg-white text-emerald-700",
  error: "border-rose-200 bg-white text-rose-700",
  info: "border-[#11111122] bg-white text-[#0A0A0A]",
} as const;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-[0_18px_36px_-18px_rgba(17,17,17,0.18)]",
                TONES[t.kind],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#0A0A0A]">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-xs text-[#0A0A0A]/55">
                    {t.description}
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar"
                className="rounded-full p-1 text-[#0A0A0A]/50 hover:bg-[#11111108] hover:text-[#0A0A0A]"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
