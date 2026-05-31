"use client";

import { create } from "zustand";

/**
 * Estado efímero del checkout. NO se persiste en localStorage para que
 * un cliente que abandone no quede atascado en un step con datos
 * inconsistentes — al volver, el flujo arranca limpio.
 */
type CheckoutStep = "address" | "summary" | "paying";

interface CheckoutState {
  step: CheckoutStep;
  selectedAddressId: string | null;
  setStep: (step: CheckoutStep) => void;
  setSelectedAddressId: (id: string | null) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  step: "address",
  selectedAddressId: null,
  setStep: (step) => set({ step }),
  setSelectedAddressId: (id) => set({ selectedAddressId: id }),
  reset: () => set({ step: "address", selectedAddressId: null }),
}));
