import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentSessionInput,
  PaymentSessionResult,
} from './payment-provider.interface';

/**
 * Provider por defecto cuando NO hay pasarela real configurada.
 *
 * Devuelve siempre verdict=PENDING_SETUP. El Order se crea PENDING y la UI
 * muestra al cliente "Estamos finalizando la conexión con la pasarela de
 * pago" sin romper el flujo de checkout.
 *
 * Reemplazable en F2.6-B (MercadoPagoCheckoutProProvider) sin tocar el
 * CheckoutService — DI swap.
 */
@Injectable()
export class NotConfiguredPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(NotConfiguredPaymentProvider.name);

  readonly name = 'NOT_CONFIGURED';
  readonly enabled = true;

  async createCheckoutSession(
    input: PaymentSessionInput,
  ): Promise<PaymentSessionResult> {
    this.logger.warn(
      `[checkout.audit] provider=NOT_CONFIGURED order=${input.orderNumber} ` +
        `total=${input.total} ${input.currency} — pasarela aún no configurada`,
    );
    return {
      verdict: 'PENDING_SETUP',
      providerSessionId: null,
      redirectUrl: null,
      mode: 'none',
      message:
        'Estamos finalizando la conexión con la pasarela de pago. Tu pedido fue registrado y nos comunicaremos contigo para completar el cobro.',
      metadata: { orderNumber: input.orderNumber },
    };
  }
}
