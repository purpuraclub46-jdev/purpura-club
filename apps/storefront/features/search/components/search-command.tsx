"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Input de búsqueda minimal — se incrusta en el navbar y, al presionar
 * Enter, navega a `/shop?search=`. La búsqueda inteligente real (trigram
 * + unaccent + ranking por similitud) corre en el endpoint `/v1/products`
 * con el param `search`, así que la página de resultados ya aprovecha la
 * tolerancia a typos/tildes sin necesidad de dropdown predictivo.
 *
 * Sin overlay, sin sugerencias, sin backdrop. Solo input → Enter → /shop.
 * Es un componente controlled: el padre (navbar) maneja `query` para que
 * los slots desktop/mobile puedan compartir el mismo input cross-viewport.
 */

interface SearchCommandProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  className?: string;
}

export function SearchCommand({
  open,
  onClose,
  query,
  onQueryChange,
  className,
}: SearchCommandProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus automático al abrir. Doble RAF para esperar al mount post-AnimatePresence.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length < 2) return;
      router.push(`/shop?search=${encodeURIComponent(trimmed)}`);
      onClose();
    }
  };

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="search-input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
          className={cn("w-full", className)}
        >
          <label className="flex h-10 w-full items-center gap-2.5 rounded-full border border-[#11111118] bg-white px-4 transition-colors duration-200 focus-within:border-[#9810FA] focus-within:shadow-[0_0_0_3px_rgba(152,16,250,0.08)]">
            <Search
              className="size-4 shrink-0 text-[#0A0A0A]/55"
              strokeWidth={1.4}
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar productos…"
              aria-label="Buscar"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] tracking-tight text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar búsqueda"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[#0A0A0A]/50 transition-colors duration-150 hover:bg-[#11111108] hover:text-[#0A0A0A]"
            >
              <X className="size-3.5" strokeWidth={1.6} />
            </button>
          </label>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
