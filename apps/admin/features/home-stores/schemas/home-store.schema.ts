import { z } from "zod";

const optionalHttpsUrl = z
  .string()
  .max(2048)
  .refine(
    (v) => v === "" || /^https:\/\/.+/.test(v),
    "Debe ser una URL absoluta HTTPS",
  )
  .optional();

const optionalAnyUrl = z
  .string()
  .max(2048)
  .refine(
    (v) => v === "" || /^https?:\/\/.+/.test(v),
    "Debe ser una URL absoluta http(s)",
  )
  .optional();

export const homeStoreSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(120, "Máximo 120 caracteres"),
  city: z
    .string()
    .min(1, "La ciudad es obligatoria")
    .max(80, "Máximo 80 caracteres"),
  address: z
    .string()
    .min(1, "La dirección es obligatoria")
    .max(240, "Máximo 240 caracteres"),
  reference: z.string().max(240).optional(),
  whatsapp: z.string().max(32).optional(),
  schedule: z.string().max(160).optional(),
  mapsUrl: optionalAnyUrl,
  imageDesktop: optionalHttpsUrl,
  imageMobile: optionalHttpsUrl,
  sortOrder: z
    .number({ message: "El orden es obligatorio" })
    .int()
    .min(0)
    .max(999),
  active: z.boolean(),
});

export type HomeStoreFormValues = z.infer<typeof homeStoreSchema>;
