import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const datetimeString = z
  .string()
  .min(1, "La fecha es obligatoria")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Fecha inválida");

const optionalDatetime = z
  .string()
  .refine(
    (v) => !v || !Number.isNaN(new Date(v).getTime()),
    "Fecha inválida",
  )
  .optional();

export const raffleSchema = z
  .object({
    title: z
      .string()
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(200),
    slug: z
      .string()
      .max(80)
      .refine((v) => v === "" || slugRegex.test(v), {
        message: "El slug solo permite minúsculas, números y guiones",
      })
      .optional(),
    description: z
      .string()
      .min(10, "La descripción debe tener al menos 10 caracteres")
      .max(10_000),
    bannerImage: z
      .string()
      .max(2048)
      .refine(
        (v) => v === "" || /^https?:\/\/.+/.test(v),
        "Debe ser una URL válida",
      )
      .optional(),
    prizeImage: z
      .string()
      .max(2048)
      .refine(
        (v) => v === "" || /^https?:\/\/.+/.test(v),
        "Debe ser una URL válida",
      )
      .optional(),
    countdown: optionalDatetime,
    ticketPrice: z
      .number({ message: "El precio del ticket es obligatorio" })
      .min(0, "El precio debe ser 0 o mayor"),
    memberTicketPrice: z
      .number({ message: "El precio para miembros es obligatorio" })
      .min(0, "El precio debe ser 0 o mayor"),
    totalTickets: z
      .number({ message: "El total de tickets es obligatorio" })
      .int()
      .min(1, "Debe haber al menos 1 ticket"),
    startDate: datetimeString,
    endDate: datetimeString,
    status: z
      .enum(["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED"])
      .optional(),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  })
  .refine(
    (data) =>
      new Date(data.endDate).getTime() > new Date(data.startDate).getTime(),
    {
      message: "La fecha de fin debe ser posterior a la de inicio",
      path: ["endDate"],
    },
  )
  .refine((data) => data.memberTicketPrice <= data.ticketPrice, {
    message: "El precio para miembros no puede ser mayor al precio público",
    path: ["memberTicketPrice"],
  });

export type RaffleFormValues = z.infer<typeof raffleSchema>;
