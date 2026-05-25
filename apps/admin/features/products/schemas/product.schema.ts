import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const urlOpt = z
  .string()
  .max(2048)
  .refine(
    (v) => v === "" || /^https?:\/\/.+/.test(v),
    "Debe ser una URL válida",
  );

export const productImageSchema = z.object({
  url: urlOpt.refine((v) => v !== "", "La URL es obligatoria"),
  order: z.number().int().min(0),
});

export const productVariantSchema = z.object({
  name: z
    .string()
    .min(1, "Nombre requerido")
    .max(60, "Máximo 60 caracteres"),
  value: z
    .string()
    .min(1, "Valor requerido")
    .max(120, "Máximo 120 caracteres"),
});

export const productAvailabilitySchema = z.object({
  inventoryLocationId: z.string().uuid("Ubicación inválida"),
  active: z.boolean(),
  initialStock: z.number().int().min(0, "No puede ser negativo"),
  minimumStock: z.number().int().min(0, "No puede ser negativo"),
});

const isoOrEmpty = z
  .string()
  .refine(
    (v) => v === "" || !Number.isNaN(new Date(v).getTime()),
    "Fecha inválida",
  )
  .optional();

export const productSchema = z
  .object({
    name: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(200),
    slug: z
      .string()
      .max(120)
      .refine((v) => v === "" || slugRegex.test(v), {
        message: "El slug solo permite minúsculas, números y guiones",
      })
      .optional(),
    description: z.string().max(10_000).optional(),
    sku: z
      .string()
      .min(2, "SKU debe tener al menos 2 caracteres")
      .max(60),
    barcode: z.string().max(60).optional(),
    price: z.number({ message: "El precio normal es obligatorio" }).min(0),
    cost: z.number().min(0).optional(),
    discountPercentage: z
      .number({ message: "Porcentaje inválido" })
      .min(0, "No puede ser negativo")
      .max(100, "No puede superar 100%")
      .nullable()
      .optional(),
    discountActive: z.boolean().optional(),
    discountStartsAt: isoOrEmpty,
    discountEndsAt: isoOrEmpty,
    featured: z.boolean().optional(),
    active: z.boolean().optional(),
    categoryIds: z.array(z.string().uuid()).max(50).optional(),
    images: z.array(productImageSchema).max(20).optional(),
    variants: z.array(productVariantSchema).max(50).optional(),
    availability: z.array(productAvailabilitySchema).max(50).optional(),
  })
  .refine(
    (data) =>
      !data.discountActive ||
      (data.discountPercentage !== null &&
        data.discountPercentage !== undefined &&
        data.discountPercentage > 0),
    {
      message:
        "Para activar la oferta debes indicar un porcentaje mayor a 0",
      path: ["discountPercentage"],
    },
  )
  .refine(
    (data) => {
      if (!data.discountStartsAt || !data.discountEndsAt) return true;
      return new Date(data.discountStartsAt) <= new Date(data.discountEndsAt);
    },
    {
      message: "La fecha de inicio debe ser anterior o igual a la de fin",
      path: ["discountEndsAt"],
    },
  );

export type ProductFormValues = z.infer<typeof productSchema>;
