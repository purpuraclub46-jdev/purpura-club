import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { NotConfiguredPaymentProvider } from './payments/not-configured-payment.provider';
import { PAYMENT_PROVIDER_TOKEN } from './payments/payment-provider.interface';

/**
 * FASE 2 / F2.6-A — Checkout ecommerce.
 *
 * El PaymentProvider se inyecta vía token. Hoy resuelve a
 * NotConfiguredPaymentProvider (sin credenciales del cliente).
 * F2.6-B reemplazará el provider por MercadoPagoCheckoutProProvider
 * sin tocar CheckoutService — DI swap puro.
 */
@Module({
  imports: [OrdersModule],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    NotConfiguredPaymentProvider,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useExisting: NotConfiguredPaymentProvider,
    },
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}
