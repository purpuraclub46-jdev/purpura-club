import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EmailPayload,
  EmailProvider,
} from '../email-provider.interface';

/**
 * Proveedor de emails por defecto: NO envía nada real.
 * Loguea el contenido en consola. Útil para desarrollo, tests, y como base
 * estable mientras se decide e instala el proveedor productivo definitivo.
 */
@Injectable()
export class NoopEmailProvider implements EmailProvider {
  private readonly logger = new Logger(NoopEmailProvider.name);

  async send(payload: EmailPayload): Promise<{ id: string; sent: boolean }> {
    const id = randomUUID();
    this.logger.log(
      `[email:${payload.template ?? 'raw'}] → ${payload.to} :: ${payload.subject}`,
    );
    return { id, sent: false };
  }
}
