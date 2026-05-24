import { create } from "zustand";
import type { ToastVariant } from "@/shared/ui/toast";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export const toast = {
  show: (toast: Omit<ToastItem, "id">) => useToastStore.getState().push(toast),
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: "success" }),
  error: (title: string, description?: string) =>
    useToastStore
      .getState()
      .push({ title, description, variant: "destructive" }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: "default" }),
};
