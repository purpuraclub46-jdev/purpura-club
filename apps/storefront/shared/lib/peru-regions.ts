/**
 * Catálogo estático de los 25 departamentos del Perú (INEI / UBIGEO nivel 1).
 *
 * Usado por el form de direcciones (F2.5) como sugerencia en el select de
 * región. El backend acepta string libre — el catálogo es solo guía de UX
 * para mantener consistencia y permitir búsqueda.
 *
 * UBIGEO completo (provincias + distritos) queda fuera de F2.5 y entra en
 * fase futura cuando se integre logística/courier.
 */
export const PERU_REGIONS = [
  "Amazonas",
  "Áncash",
  "Apurímac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Callao",
  "Cusco",
  "Huancavelica",
  "Huánuco",
  "Ica",
  "Junín",
  "La Libertad",
  "Lambayeque",
  "Lima",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "San Martín",
  "Tacna",
  "Tumbes",
  "Ucayali",
] as const;

export type PeruRegion = (typeof PERU_REGIONS)[number];

export function isPeruRegion(value: string): value is PeruRegion {
  return (PERU_REGIONS as readonly string[]).includes(value);
}
