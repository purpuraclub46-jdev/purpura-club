export type {
  HomeBannerAlign,
  HomeBannerEntity,
  HomeBannerSlot,
  UpdateHomeBannerPayload,
} from "@/types/api";

import type { HomeBannerSlot } from "@/types/api";

export interface SlotMeta {
  slot: HomeBannerSlot;
  label: string;
  description: string;
  defaultEyebrow: string;
  defaultCtaLabel: string;
  defaultCtaHref: string;
  /// Slot fijo: el FLEXIBLE puede desactivarse y mostrarse opcionalmente.
  hideable: boolean;
}

export const SLOT_META: Record<HomeBannerSlot, SlotMeta> = {
  JEWELRY: {
    slot: "JEWELRY",
    label: "Joyas",
    description:
      "Primera franja del hero. Pensada para la categoría joyería.",
    defaultEyebrow: "Joyería atemporal",
    defaultCtaLabel: "Ver productos",
    defaultCtaHref: "/shop?category=joyas",
    hideable: false,
  },
  PERFUME: {
    slot: "PERFUME",
    label: "Perfumes",
    description: "Segunda franja del hero. Categoría perfumería.",
    defaultEyebrow: "Perfumería de autor",
    defaultCtaLabel: "Ver productos",
    defaultCtaHref: "/shop?category=perfumes",
    hideable: false,
  },
  RAFFLE: {
    slot: "RAFFLE",
    label: "Sorteos",
    description:
      "Tercera franja. Único banner del home que habla de sorteos.",
    defaultEyebrow: "Club Púrpura",
    defaultCtaLabel: "Ir a sorteos",
    defaultCtaHref: "/sorteos",
    hideable: false,
  },
  FLEXIBLE: {
    slot: "FLEXIBLE",
    label: "Banner flexible",
    description:
      "Cuarta franja opcional. Desactívala para ocultarla del home.",
    defaultEyebrow: "Edición especial",
    defaultCtaLabel: "Descubrir",
    defaultCtaHref: "/shop",
    hideable: true,
  },
};

export const SLOT_ORDER: HomeBannerSlot[] = [
  "JEWELRY",
  "PERFUME",
  "RAFFLE",
  "FLEXIBLE",
];
