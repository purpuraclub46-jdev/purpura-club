"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  /** Precio CON IGV — el cliente paga este monto. */
  unitPrice: number;
  /** Stock disponible al momento de agregar (validación local). */
  stock: number;
  quantity: number;
  /** Categoría principal — opcional para retrocompatibilidad con carritos persistidos antes del refactor del drawer. */
  category?: string | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  hydrated: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const round = (n: number): number => Math.max(0, Math.floor(n));

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      hydrated: false,
      add: (item, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === item.productId);
          if (existing) {
            const next = Math.min(existing.quantity + quantity, item.stock || 999);
            return {
              items: s.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: next } : i,
              ),
              isOpen: true,
            };
          }
          const initial = Math.min(round(quantity) || 1, item.stock || 999);
          return {
            items: [...s.items, { ...item, quantity: initial }],
            isOpen: true,
          };
        }),
      remove: (productId) =>
        set((s) => ({
          items: s.items.filter((i) => i.productId !== productId),
        })),
      setQuantity: (productId, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId
              ? {
                  ...i,
                  quantity: Math.min(
                    Math.max(1, round(quantity)),
                    i.stock || 999,
                  ),
                }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      toggleDrawer: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: "pp-storefront-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const selectCartCount = (s: CartState): number =>
  s.items.reduce((acc, i) => acc + i.quantity, 0);

export const selectCartGross = (s: CartState): number =>
  Math.round(
    s.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0) * 100,
  ) / 100;
