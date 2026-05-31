/**
 * FASE 2 / F2.6-A — Abstracción de pasarela de pago para checkout ecommerce.
 *
 * El CheckoutService delega en un PaymentProvider la creación de la
 * sesión de pago externa (Preference de MercadoPago, Session de Stripe, etc).
 *
 * Diseño:
 *   - El Order siempre se crea PENDING ANTES de invocar al provider.
 *   - El provider devuelve uno de tres veredictos:
 *       REDIRECT       → cliente debe ir a `redirectUrl` para pagar.
 *       PENDING_SETUP  → no hay provider real configurado (F2.6-A "stub").
 *                        La orden queda PENDING y la UI muestra "pasarela
 *                        en configuración". Útil para entornos sin
 *                        credenciales reales.
 *       UNSUPPORTED    → el provider rechazó la sesión (configuración
 *                        inválida, método no soportado, etc).
 *   - El provider NUNCA actualiza Order.status. La fuente de verdad para
 *     PENDING → PAID es el webhook + verificación independiente (F2.6-B).
 *
 * Esta abstracción NO es para sorteos. Los sorteos usan su propio flujo
 * Yape → comprobante → validación manual (RaffleEntriesService).
 */

import { OrderPaymentMethod } from '@prisma/client';

export type PaymentSessionVerdict =
  | 'REDIRECT'
  | 'PENDING_SETUP'
  | 'UNSUPPORTED';

export interface PaymentSessionItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface PaymentSessionPayer {
  email: string | null;
  firstName: string;
  lastName: string;
  documentType: string | null;
  documentNumber: string | null;
}

export interface PaymentSessionInput {
  orderId: string;
  orderNumber: string;
  customerId: string;
  total: number;
  currency: string;
  paymentMethod: OrderPaymentMethod;
  items: PaymentSessionItem[];
  payer: PaymentSessionPayer;
  returnUrls: {
    success: string;
    pending: string;
    failure: string;
  };
  notificationUrl: string;
}

export interface PaymentSessionResult {
  verdict: PaymentSessionVerdict;
  /** Identificador del provider para la sesión (Preference.id, etc). */
  providerSessionId: string | null;
  /** URL a la que redirigir al cliente. Solo válido si verdict=REDIRECT. */
  redirectUrl: string | null;
  /** Sandbox o producción según provider. */
  mode: 'sandbox' | 'production' | 'none';
  /** Mensaje legible para mostrar al cliente cuando no es REDIRECT. */
  message: string;
  /** Metadata libre del provider. Para debug/auditoría. */
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;
  readonly enabled: boolean;

  /**
   * Crea una sesión de pago externa para una Order ya persistida en estado
   * PENDING. NUNCA debe llamar a OrdersService.updateStatus — esa responsabilidad
   * es exclusiva del webhook handler tras verificación contra la API del
   * provider.
   */
  createCheckoutSession(input: PaymentSessionInput): Promise<PaymentSessionResult>;
}

export const PAYMENT_PROVIDER_TOKEN = Symbol('PAYMENT_PROVIDER');
