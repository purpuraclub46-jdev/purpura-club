/**
 * Templates base de emails para el ciclo de vida de la membresía Púrpura Club.
 * Mantenemos HTML/plain en español, listos para reemplazar por un sistema
 * de plantillas más sofisticado (MJML, Handlebars) en el futuro.
 */

const BRAND_COLOR = '#9810FA';

export interface MembershipEmailContext {
  firstName: string;
  expiresAt: Date;
  daysRemaining?: number;
}

const formatDate = (date: Date): string =>
  date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const wrap = (innerHtml: string): string => `
<!doctype html>
<html lang="es">
  <body style="font-family: 'Inter', -apple-system, sans-serif; background:#0A0A0A; color:#FFFFFF; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #131313; border-radius: 16px; padding: 32px;">
      <h1 style="color:${BRAND_COLOR}; font-size: 22px; margin: 0 0 16px;">Púrpura Club</h1>
      ${innerHtml}
      <hr style="border:0; border-top:1px solid #2a2a2a; margin:32px 0 16px;" />
      <p style="font-size:12px; color:#9b9b9b; margin:0;">
        Recibiste este correo por ser parte de Púrpura Club.
      </p>
    </div>
  </body>
</html>`;

export const welcomeMembershipTemplate = (
  ctx: MembershipEmailContext,
): { subject: string; text: string; html: string } => {
  const subject = `Bienvenido a Púrpura Club, ${ctx.firstName}`;
  const text = `Hola ${ctx.firstName},

Tu membresía Púrpura Club está activa hasta el ${formatDate(ctx.expiresAt)}. Disfruta tu 10 % adicional en productos con oferta vigente y participaciones automáticas por cada S/25 que gastes.

¡Bienvenido!`;
  const html = wrap(`
    <p>Hola <strong>${ctx.firstName}</strong>,</p>
    <p>
      Tu membresía Púrpura Club está <strong style="color:${BRAND_COLOR}">activa</strong>
      hasta el ${formatDate(ctx.expiresAt)}.
    </p>
    <p>
      Disfruta tu <strong>10 % adicional</strong> en productos con oferta vigente
      y participaciones automáticas por cada S/25 que gastes.
    </p>
    <p style="margin-top:24px;">¡Bienvenido!</p>
  `);

  return { subject, text, html };
};

export const expirationReminderTemplate = (
  ctx: MembershipEmailContext & { daysRemaining: number },
): { subject: string; text: string; html: string } => {
  const subject = `Tu membresía Púrpura Club vence en ${ctx.daysRemaining} día${
    ctx.daysRemaining === 1 ? '' : 's'
  }`;
  const text = `Hola ${ctx.firstName},

Tu membresía vence el ${formatDate(ctx.expiresAt)}. Haz una compra mayor a S/25 antes de esa fecha para renovarla 30 días más.

¡Te esperamos!`;
  const html = wrap(`
    <p>Hola <strong>${ctx.firstName}</strong>,</p>
    <p>
      Tu membresía vence el
      <strong style="color:${BRAND_COLOR}">${formatDate(ctx.expiresAt)}</strong>.
    </p>
    <p>
      Realiza una compra mayor a <strong>S/25</strong> antes de esa fecha
      para renovarla 30 días más y mantener tus beneficios.
    </p>
  `);

  return { subject, text, html };
};
