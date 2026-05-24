import { Module } from '@nestjs/common';
import { FreePaymentProvider } from './payments/free-payment.provider';
import { MercadoPagoPaymentProvider } from './payments/mercadopago-payment.provider';
import { PAYMENT_PROVIDERS_TOKEN } from './payments/payment-provider.interface';
import { PaymentProviderRegistry } from './payments/payment-provider.registry';
import { YapePaymentProvider } from './payments/yape-payment.provider';
import { RaffleEntriesController } from './raffle-entries.controller';
import { RaffleEntriesService } from './raffle-entries.service';
import { RaffleEntriesRepository } from './repositories/raffle-entries.repository';

@Module({
  controllers: [RaffleEntriesController],
  providers: [
    RaffleEntriesService,
    RaffleEntriesRepository,
    FreePaymentProvider,
    YapePaymentProvider,
    MercadoPagoPaymentProvider,
    {
      provide: PAYMENT_PROVIDERS_TOKEN,
      useFactory: (
        free: FreePaymentProvider,
        yape: YapePaymentProvider,
        mp: MercadoPagoPaymentProvider,
      ) => [free, yape, mp],
      inject: [FreePaymentProvider, YapePaymentProvider, MercadoPagoPaymentProvider],
    },
    PaymentProviderRegistry,
  ],
  exports: [RaffleEntriesService, RaffleEntriesRepository, PaymentProviderRegistry],
})
export class RaffleEntriesModule {}
