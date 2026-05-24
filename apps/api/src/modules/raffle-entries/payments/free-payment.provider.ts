import { BadRequestException, Injectable } from '@nestjs/common';
import { EntryStatus, PaymentMethod } from '@prisma/client';
import {
  PaymentInitiationContext,
  PaymentInitiationResult,
  PaymentProvider,
} from './payment-provider.interface';

@Injectable()
export class FreePaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.FREE;
  readonly enabled = true;

  async initiate(
    context: PaymentInitiationContext,
  ): Promise<PaymentInitiationResult> {
    if (context.unitPrice > 0) {
      throw new BadRequestException(
        'FREE payment method can only be used on zero-priced raffles',
      );
    }

    return {
      status: EntryStatus.PAID,
      reference: `free-${Date.now()}`,
    };
  }
}
