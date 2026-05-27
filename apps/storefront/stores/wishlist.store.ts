"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  /** Precio CON IGV mostrado al cliente. */
  unitPrice: number;
  /** Precio comparativo (lista) cuando hay descuento. */
  compareAtPrice: number | null;
  stock: number;
  /** Categoría principal para mostrar etiqueta editorial. */
  category: string | null;
  /** ISO timestamp del momento en que se guardó. */
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  isOpen: boolean;
  hydrated: boolean;
  add: (item: Omit<WishlistItem, "addedAt">) => void;
  remove: (productId: string) => void;
  toggle: (item: Omit<WishlistItem, "addedAt">) => boolean;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hydrated: false,
      add: (item) =>
        set((s) => {
          if (s.items.some((i) => i.productId === item.productId)) return s;
          return {
            items: [{ ...item, addedAt: new Date().toISOString() }, ...s.items],
          };
        }),
      remove: (productId) =>
        set((s) => ({
          items: s.items.filter((i) => i.productId !== productId),
        })),
      toggle: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId);
        if (exists) {
          set((s) => ({
            items: s.items.filter((i) => i.productId !== item.productId),
          }));
          return false;
        }
        set((s) => ({
          items: [{ ...item, addedAt: new Date().toISOString() }, ...s.items],
        }));
        return true;
      },
      clear: () => set({ items: [] }),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      toggleDrawer: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: "pp-storefront-wishlist",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const selectWishlistCount = (s: WishlistState): number => s.items.length;

export const selectIsFavorite =
  (productId: string) =>
  (s: WishlistState): boolean =>
    s.items.some((i) => i.productId === productId);
