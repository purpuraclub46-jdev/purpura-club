"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const MESSAGES = [
  "✨ Acumula puntos y sube de nivel en el Club Púrpura",
  "🎁 Participa en sorteos exclusivos comprando en Purpura Club",
  "💎 Refiere amigos y gana descuentos y puntos",
  "🚚 Envíos seguros a todo el Perú",
  "🏆 Los miembros del club acceden a promociones exclusivas",
  "🎟️ Cada compra puede darte tickets para sorteos",
  "🔥 Ofertas premium por tiempo limitado",
  "💳 Compra fácil y segura con múltiples métodos de pago",
];

const ROTATION_MS = 4500;

export function TopBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden bg-[#0A0A0A] text-white">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center px-5 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="text-center text-[11px] font-medium tracking-[0.14em] sm:tracking-[0.22em]"
            aria-live="polite"
          >
            {MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#9810FA]/55 to-transparent"
      />
    </div>
  );
}
