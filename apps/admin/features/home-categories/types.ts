export type {
  HomeCategoryEntity,
  HomeCategorySlot,
  UpdateHomeCategoryPayload,
} from "@/types/api";

import type { HomeCategorySlot } from "@/types/api";

export interface SlotMeta {
  slot: HomeCategorySlot;
  label: string;
  description: string;
  defaultEyebrow: string;
  defaultLabel: string;
  defaultCtaHref: string;
}

export const SLOT_META: Record<HomeCategorySlot, SlotMeta> = {
  PERFUMES_HOMBRE: {
    slot: "PERFUMES_HOMBRE",
    label: "Perfumes para hombre",
    description:
      "Primera card del carrusel. Subcategoría de perfumería masculina.",
    defaultEyebrow: "Perfumería",
    defaultLabel: "Perfumes para hombre",
    defaultCtaHref: "/shop?subcategory=perfumes-hombre",
  },
  PERFUMES_MUJER: {
    slot: "PERFUMES_MUJER",
    label: "Perfumes para mujer",
    description:
      "Segunda card del carrusel. Subcategoría de perfumería femenina.",
    defaultEyebrow: "Perfumería",
    defaultLabel: "Perfumes para mujer",
    defaultCtaHref: "/shop?subcategory=perfumes-mujer",
  },
  JOYAS_ACERO_DORADO: {
    slot: "JOYAS_ACERO_DORADO",
    label: "Joyas en acero dorado",
    description:
      "Tercera card. Acero quirúrgico con baño dorado, hipoalergénico.",
    defaultEyebrow: "Joyería",
    defaultLabel: "Joyas en acero dorado",
    defaultCtaHref: "/shop?subcategory=joyas-acero-dorado",
  },
  JOYAS_ACERO_PLATEADO: {
    slot: "JOYAS_ACERO_PLATEADO",
    label: "Joyas en acero plateado",
    description:
      "Cuarta card. Acero quirúrgico plateado, hipoalergénico y duradero.",
    defaultEyebrow: "Joyería",
    defaultLabel: "Joyas en acero plateado",
    defaultCtaHref: "/shop?subcategory=joyas-acero-plateado",
  },
  JOYAS_BANADAS_ORO: {
    slot: "JOYAS_BANADAS_ORO",
    label: "Joyas bañadas en oro",
    description:
      "Quinta card. Piezas con baño de oro 18k sobre base de plata o acero.",
    defaultEyebrow: "Joyería",
    defaultLabel: "Joyas bañadas en oro",
    defaultCtaHref: "/shop?subcategory=joyas-banadas-en-oro",
  },
  JOYAS_PLATA: {
    slot: "JOYAS_PLATA",
    label: "Joyas de plata",
    description: "Sexta card. Joyería en plata 925 fina.",
    defaultEyebrow: "Joyería",
    defaultLabel: "Joyas de plata",
    defaultCtaHref: "/shop?subcategory=joyas-plata",
  },
};

export const SLOT_ORDER: HomeCategorySlot[] = [
  "PERFUMES_HOMBRE",
  "PERFUMES_MUJER",
  "JOYAS_ACERO_DORADO",
  "JOYAS_ACERO_PLATEADO",
  "JOYAS_BANADAS_ORO",
  "JOYAS_PLATA",
];
