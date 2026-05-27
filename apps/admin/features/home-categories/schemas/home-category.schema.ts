import { z } from "zod";

const optionalUrl = z
  .string()
  .max(2048)
  .refine(
    (v) => v === "" || /^https:\/\/.+/.test(v),
    "Debe ser una URL absoluta HTTPS",
  )
  .optional();

const hrefValidator = z
  .string()
  .min(1, "El destino es obligatorio")
  .max(500)
  .refine(
    (v) => v.startsWith("/") || /^https?:\/\/.+/.test(v),
    'Debe empezar con "/" o ser una URL absoluta http(s)',
  );

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido (ej. #0A0A0A)");

export const homeCategorySchema = z.object({
  sortOrder: z
    .number({ message: "El orden es obligatorio" })
    .int()
    .min(0)
    .max(99),
  active: z.boolean(),
  eyebrow: z.string().max(60).optional(),
  label: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(80, "Máximo 80 caracteres"),
  ctaHref: hrefValidator,
  imageDesktop: optionalUrl,
  imageMobile: optionalUrl,
  overlayColor: hexColor,
  overlayOpacity: z
    .number({ message: "La opacidad es obligatoria" })
    .int()
    .min(0)
    .max(100),
});

export type HomeCategoryFormValues = z.infer<typeof homeCategorySchema>;
