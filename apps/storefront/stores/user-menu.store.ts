"use client";

import { create } from "zustand";

/**
 * Store del UserMenu (login modal del header).
 *
 * Centraliza el estado `isOpen` para que CUALQUIER surface del storefront
 * pueda abrir el login oficial sin duplicar formularios — register page,
 * checkout, mi-cuenta cuando no hay sesión, etc.
 *
 * El componente `UserMenu` del header es el único consumidor del estado
 * visual; el resto de la app sólo llama `open()` y deja que el header
 * renderice el panel.
 */
interface UserMenuState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useUserMenuStore = create<UserMenuState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
