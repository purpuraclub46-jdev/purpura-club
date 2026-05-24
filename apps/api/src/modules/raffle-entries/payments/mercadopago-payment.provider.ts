import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import {
  PaymentInitiationContext,
  PaymentInitiationResult,
  PaymentProvider,
} from './payment-provider.interface';

@Injectable()
export class MercadoPagoPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.MERCADOPAGO;
  readonly enabled = false;

  async initiate(
    _context: PaymentInitiationContext,
  ): Promise<PaymentInitiationResult> {
    throw new NotImplementedException(
      'MercadoPago integration is not yet enabled',
    );
  }
}
