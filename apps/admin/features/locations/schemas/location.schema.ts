import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const locationSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(120),
  slug: z
    .string()
    .max(80)
    .refine((v) => v === "" || slugRegex.test(v), {
      message: "Solo minúsculas, números y guiones",
    })
    .optional(),
  type: z.enum(["ECOMMERCE", "SUCURSAL", "ALMACEN"]),
  address: z.string().max(300).optional(),
  phone: z.string().max(40).optional(),
  active: z.boolean().optional(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
