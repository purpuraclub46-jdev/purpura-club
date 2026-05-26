import { CustomerDocumentType } from '@prisma/client';

/**
 * Validadores de documentos fiscales peruanos.
 *
 * Reglas SUNAT:
 *  - DNI: 8 dígitos (RENIEC).
 *  - RUC: 11 dígitos. El primer dígito identifica el tipo de contribuyente:
 *      10 = persona natural con negocio
 *      15 = persona natural extranjera (poco común)
 *      17 = persona natural no domiciliada
 *      20 = persona jurídica
 *    El último dígito es un check digit calculado con módulo 11.
 *  - CE: carnet de extranjería, 9-12 alfanuméricos (regla flexible).
 *  - PASSPORT: alfanumérico 6-12.
 *
 * Las funciones devuelven `null` si es válido o un string con el motivo si no.
 */

const RUC_FACTORS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Valida un RUC peruano (11 dígitos + check digit módulo 11). */
export function validateRuc(value: string): string | null {
  if (!/^\d{11}$/.test(value)) {
    return 'RUC debe tener exactamente 11 dígitos numéricos';
  }
  const prefix = value.substring(0, 2);
  const validPrefixes = ['10', '15', '17', '20'];
  if (!validPrefixes.includes(prefix)) {
    return `RUC debe iniciar con 10, 15, 17 o 20 (recibido: ${prefix})`;
  }
  // Validación check digit módulo 11
  const digits = value.split('').map((c) => Number(c));
  const expected = digits[10];
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += digits[i] * RUC_FACTORS[i];
  }
  const mod = sum % 11;
  const computed = 11 - mod;
  const checkDigit = computed === 10 ? 0 : computed === 11 ? 1 : computed;
  if (checkDigit !== expected) {
    return 'RUC tiene un dígito de verificación inválido';
  }
  return null;
}

/** Valida un DNI peruano (RENIEC: 8 dígitos). */
export function validateDni(value: string): string | null {
  if (!/^\d{8}$/.test(value)) {
    return 'DNI debe tener exactamente 8 dígitos numéricos';
  }
  return null;
}

/** Valida un carnet de extranjería (CE) — 9-12 alfanuméricos. */
export function validateCe(value: string): string | null {
  if (!/^[A-Za-z0-9]{9,12}$/.test(value)) {
    return 'CE debe tener 9-12 caracteres alfanuméricos';
  }
  return null;
}

/** Valida un pasaporte — 6-12 alfanuméricos. */
export function validatePassport(value: string): string | null {
  if (!/^[A-Za-z0-9]{6,12}$/.test(value)) {
    return 'Pasaporte debe tener 6-12 caracteres alfanuméricos';
  }
  return null;
}

/** Valida un documento según su tipo. Devuelve `null` si OK. */
export function validateDocument(
  type: CustomerDocumentType,
  value: string,
): string | null {
  switch (type) {
    case CustomerDocumentType.DNI:
      return validateDni(value);
    case CustomerDocumentType.RUC:
      return validateRuc(value);
    case CustomerDocumentType.CE:
      return validateCe(value);
    case CustomerDocumentType.PASSPORT:
      return validatePassport(value);
    default:
      return 'Tipo de documento no soportado';
  }
}

/**
 * Devuelve el tipo de comprobante recomendado para un tipo de documento.
 *  - RUC → FACTURA (obligatorio para personas jurídicas / contribuyentes)
 *  - DNI / CE / PASSPORT → BOLETA (consumidor final)
 *
 * El cajero puede sobreescribir si el cliente con RUC pide boleta para
 * gasto personal, pero el sistema sugiere el correcto por defecto.
 */
export function suggestReceiptForDocument(
  type: CustomerDocumentType,
): 'BOLETA' | 'FACTURA' {
  return type === CustomerDocumentType.RUC ? 'FACTURA' : 'BOLETA';
}

export const DocumentValidators = {
  validateDni,
  validateRuc,
  validateCe,
  validatePassport,
  validateDocument,
  suggestReceiptForDocument,
};
