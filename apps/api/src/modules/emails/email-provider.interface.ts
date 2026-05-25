/**
 * Contrato del proveedor de emails. El servicio real (Resend, SES, Mailgun)
 * se implementará detrás de esta interfaz sin tocar a los consumidores.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Identificador del template usado para trazabilidad / analytics. */
  template?: string;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<{ id: string; sent: boolean }>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
