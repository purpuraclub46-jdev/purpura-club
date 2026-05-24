import { Injectable, Logger } from '@nestjs/common';
import { EntryStatus, PaymentMethod } from '@prisma/client';
import {
  PaymentInitiationContext,
  PaymentInitiationResult,
  PaymentProvider,
} from './payment-provider.interface';

@Injectable()
export class YapePaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.YAPE;
  readonly enabled = false;

  private readonly logger = new Logger(YapePaymentProvider.name);

  async initiate(
    context: PaymentInitiationContext,
  ): Promise<PaymentInitiationResult> {
    this.logger.debug(
      `Yape entry requested for user=${context.user.id} raffle=${context.raffleId} qty=${context.quantity}`,
    );

    return {
      status: EntryStatus.PENDING_PAYMENT,
      reference: `yape-pending-${Date.now()}`,
      metadata: {
        instructions:
          'Yape integration is not enabled yet — entries remain pending until proof of payment is uploaded.',
      },
    };
  }
}
