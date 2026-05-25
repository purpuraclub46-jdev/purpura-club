import { Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email-provider.interface';
import { EmailsService } from './emails.service';
import { NoopEmailProvider } from './providers/noop-email.provider';

@Module({
  providers: [
    NoopEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useExisting: NoopEmailProvider,
    },
    EmailsService,
  ],
  exports: [EmailsService],
})
export class EmailsModule {}
