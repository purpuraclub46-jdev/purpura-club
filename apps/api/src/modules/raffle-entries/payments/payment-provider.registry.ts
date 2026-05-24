import {
  BadRequestException,
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import {
  PAYMENT_PROVIDERS_TOKEN,
  PaymentProvider,
} from './payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<PaymentMethod, PaymentProvider>();

  constructor(
    @Inject(PAYMENT_PROVIDERS_TOKEN) providers: PaymentProvider[],
  ) {
    for (const provider of providers) {
      if (this.providers.has(provider.method)) {
        throw new Error(
          `Duplicate payment provider registered for method ${provider.method}`,
        );
      }
      this.providers.set(provider.method, provider);
    }
  }

  resolve(method: PaymentMethod): PaymentProvider {
    const provider = this.providers.get(method);

    if (!provider) {
      throw new BadRequestException(
        `Payment method ${method} is not supported`,
      );
    }

    if (!provider.enabled) {
      throw new NotImplementedException(
        `Payment method ${method} is not enabled yet`,
      );
    }

    return provider;
  }

  isEnabled(method: PaymentMethod): boolean {
    return this.providers.get(method)?.enabled ?? false;
  }
}
