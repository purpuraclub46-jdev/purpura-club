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

export const homeBannerSchema = z.object({
  order: z
    .number({ message: "El orden es obligatorio" })
    .int()
    .min(0)
    .max(99),
  active: z.boolean(),
  eyebrow: z.string().max(80).optional(),
  title: z
    .string()
    .min(1, "El título es obligatorio")
    .max(160, "Máximo 160 caracteres"),
  subtitle: z.string().max(320, "Máximo 320 caracteres").optional(),
  ctaLabel: z
    .string()
    .min(1, "El texto del botón es obligatorio")
    .max(40, "Máximo 40 caracteres"),
  ctaHref: hrefValidator,
  imageDesktop: optionalUrl,
  imageMobile: optionalUrl,
  overlayColor: hexColor,
  overlayOpacity: z
    .number({ message: "La opacidad es obligatoria" })
    .int()
    .min(0)
    .max(100),
  align: z.enum(["LEFT", "CENTER", "RIGHT"]),
});

export type HomeBannerFormValues = z.infer<typeof homeBannerSchema>;
