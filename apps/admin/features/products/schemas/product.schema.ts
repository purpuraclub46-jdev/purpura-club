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
    price: z.number({ message: "El precio es obligatorio" }).min(0),
    memberPrice: z
      .number({ message: "El precio miembro es obligatorio" })
      .min(0),
    cost: z.number().min(0).optional(),
    featured: z.boolean().optional(),
    active: z.boolean().optional(),
    categoryIds: z.array(z.string().uuid()).max(50).optional(),
    images: z.array(productImageSchema).max(20).optional(),
    variants: z.array(productVariantSchema).max(50).optional(),
  })
  .refine((data) => data.memberPrice <= data.price, {
    message: "El precio miembro no puede ser mayor al precio normal",
    path: ["memberPrice"],
  });

export type ProductFormValues = z.infer<typeof productSchema>;
