import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  slug: z
    .string()
    .max(80)
    .refine((v) => v === "" || slugRegex.test(v), {
      message: "El slug solo permite minúsculas, números y guiones",
    })
    .optional(),
  image: z
    .string()
    .max(2048)
    .refine(
      (v) => v === "" || /^https?:\/\/.+/.test(v),
      "Debe ser una URL válida",
    )
    .optional(),
  group: z.enum(["JOYERIA", "PERFUMES", "ACCESORIOS"]),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  parentId: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
