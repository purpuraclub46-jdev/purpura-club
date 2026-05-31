/**
 * F2.7-C — Constructor de URLs de WhatsApp share.
 *
 * Usa `wa.me` (el endpoint canónico de WhatsApp). Si se pasa `phone` se abre
 * el chat directo; sin phone, abre el dialer de contactos para elegir destino.
 *
 * El texto se URL-encodea siempre — esto preserva el link del referido (que
 * contiene `?ref=PCLUB-XXXXXX`) sin que WhatsApp lo trunque.
 */
export function buildWhatsAppShareUrl(text: string, phone?: string): string {
  const baseUrl = "https://wa.me";
  const encoded = encodeURIComponent(text);
  const cleanPhone = phone?.replace(/\D/g, "");
  if (cleanPhone) return `${baseUrl}/${cleanPhone}?text=${encoded}`;
  return `${baseUrl}/?text=${encoded}`;
}

/**
 * Mensaje canónico para compartir un link de referido por WhatsApp.
 * Texto en castellano, breve, con el link al final.
 */
export function buildReferralShareMessage(referralUrl: string): string {
  return [
    "✨ Únete a Púrpura Club y participa en sorteos exclusivos.",
    "",
    "Regístrate con mi enlace:",
    referralUrl,
  ].join("\n");
}
