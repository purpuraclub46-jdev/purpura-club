import { Inject, Injectable } from '@nestjs/common';
import {
  EMAIL_PROVIDER,
  type EmailPayload,
  type EmailProvider,
} from './email-provider.interface';
import {
  expirationReminderTemplate,
  welcomeMembershipTemplate,
} from './templates/membership.templates';
import type { MembershipEmailContext } from './templates/membership.templates';

@Injectable()
export class EmailsService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {}

  send(payload: EmailPayload) {
    return this.provider.send(payload);
  }

  sendWelcomeMembership(to: string, ctx: MembershipEmailContext) {
    const tpl = welcomeMembershipTemplate(ctx);
    return this.provider.send({
      to,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      template: 'membership.welcome',
    });
  }

  sendExpirationReminder(
    to: string,
    ctx: MembershipEmailContext & { daysRemaining: number },
  ) {
    const tpl = expirationReminderTemplate(ctx);
    return this.provider.send({
      to,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      template: 'membership.expiration-reminder',
    });
  }
}
