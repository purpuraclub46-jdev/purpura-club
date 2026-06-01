import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email-provider.interface';
import { EmailsService } from './emails.service';
import { NoopEmailProvider } from './providers/noop-email.provider';

/**
 * F2.7-E / E4 — Guard de boot.
 *
 * En producción NUNCA permitimos que el `NoopEmailProvider` quede
 * accidentalmente cableado: si lo hiciera, todas las notificaciones del
 * Club (welcome + reminders 7/3/1) se logguearían a stdout pero los
 * clientes no recibirían nada y la auditoría (`MembershipNotificationLog`)
 * marcaría falsos positivos.
 *
 * El comportamiento es:
 *   - `NODE_ENV !== 'production'`  → noop OK
 *   - `NODE_ENV === 'production'` + `EMAIL_ALLOW_NOOP=true` → noop OK
 *     (escape hatch para deploys de prueba / pre-launch sin provider real)
 *   - `NODE_ENV === 'production'` sin opt-in → throw, el deploy aborta
 *
 * Cuando se cablee el provider real (Resend / SES / Mailgun), reemplazar
 * el `useExisting: NoopEmailProvider` por el provider productivo. El guard
 * sigue protegiendo contra regresiones.
 */
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
export class EmailsModule implements OnModuleInit {
  private readonly logger = new Logger(EmailsModule.name);

  onModuleInit(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowNoop = process.env.EMAIL_ALLOW_NOOP === 'true';

    if (isProduction && !allowNoop) {
      // F2.7-E / E4 — En producción, sin provider real cableado, abortamos
      // el arranque. Esto es un fail-loud por diseño.
      throw new Error(
        'EmailsModule: NoopEmailProvider está activo en NODE_ENV=production. ' +
          'Cablea un provider real (Resend/SES/Mailgun) o setea EMAIL_ALLOW_NOOP=true ' +
          'si este deploy es intencionalmente sin envío real.',
      );
    }

    if (isProduction && allowNoop) {
      this.logger.warn(
        'EMAIL_ALLOW_NOOP=true en producción — los emails NO se enviarán realmente, ' +
          'sólo se loguearán. Confirma que esto es intencional.',
      );
    }
  }
}
