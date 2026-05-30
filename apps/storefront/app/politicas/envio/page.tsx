"use client";

import {
  PolicyPage,
  type PolicySectionDef,
} from "@/features/policies/components/policy-shell";

/**
 * /politicas/envio — Políticas de envío.
 *
 * Mismo sistema visual editorial luxury que `/politicas/devolucion` —
 * cero divergencia visual. Aquí solo declaramos contenido y datos
 * (tiempos, tarifas, condiciones de envío local y nacional).
 *
 * Estructura:
 *   01 Delivery local       — tarifas distritales + horarios + reglas
 *   02 Envíos nacionales    — tarifa única + tiempos + reglas transportista
 *   03 Envío gratis         — condiciones (compra mínima S/ 250)
 *   04 Consideraciones      — recordatorios transversales + nota crítica
 *                              del "único intento de entrega"
 *
 * La nota "único intento de entrega" se consolida en la sección 04 para
 * no duplicarse entre 01 y 02 — ahí gana presencia visual editorial vs.
 * repetirla dos veces idéntica.
 */

const HIGHLIGHTS = [
  "Delivery el mismo día",
  "Envíos a todo el Perú",
  "Envío gratis desde S/ 250",
  "Seguimiento del pedido",
];

const HIGHLIGHTS_SHORT = [
  "Mismo día",
  "Todo el Perú",
  "Free desde S/ 250",
  "Tracking",
];

const SECTIONS: PolicySectionDef[] = [
  {
    id: "delivery-local",
    number: "01",
    shortTitle: "Delivery local",
    title: "Delivery local",
    intro:
      "Los pedidos confirmados dentro del horario de atención serán entregados el mismo día.",
    tariffs: {
      title: "Tarifas",
      items: [
        { price: "S/ 8.90", label: "Distrito principal" },
        { price: "S/ 12.90", label: "Distritos cercanos" },
        { price: "S/ 16.90", label: "Distritos alejados" },
      ],
    },
    bulletsTitle: "Consideraciones",
    bullets: [
      "Los pedidos realizados después del horario de corte serán programados para el siguiente día hábil.",
      "No se realizan entregas en días feriados.",
      "Las tarifas de envío pueden variar durante campañas especiales, fechas festivas o temporadas de alta demanda.",
      "Si necesitas una entrega urgente, contáctanos a través de nuestro canal de atención al cliente para evaluar la disponibilidad.",
    ],
  },
  {
    id: "envios-nacionales",
    number: "02",
    shortTitle: "Nacionales",
    title: "Envíos a todo el Perú",
    intro:
      "Una vez confirmado el pedido, requerimos hasta 2 días hábiles para su preparación y despacho.",
    tariffs: {
      title: "Tarifa nacional",
      items: [
        { price: "S/ 14.90", label: "Envío estándar a nivel nacional" },
      ],
    },
    bulletsTitle: "Consideraciones",
    bullets: [
      "Los pedidos realizados después del horario de atención del viernes serán procesados a partir del siguiente día hábil.",
      "Los tiempos de entrega dependen de la empresa de transporte y del destino final.",
      "Una vez despachado el pedido, recibirás una notificación por correo electrónico con la información correspondiente.",
      "En algunos casos se proporcionará un código de seguimiento para rastrear el envío.",
      "Las entregas son programadas directamente por la empresa transportista, por lo que no es posible garantizar una hora exacta de entrega.",
      "Si existe alguna indicación especial para tu pedido, podrás agregarla durante el proceso de compra.",
      "Los días hábiles no incluyen sábados, domingos ni feriados.",
      "El horario habitual de entrega es de 10:00 a.m. a 6:00 p.m.",
      "Los pedidos con envío gratuito se realizan bajo la modalidad de envío estándar.",
    ],
  },
  {
    id: "envio-gratis",
    number: "03",
    shortTitle: "Envío gratis",
    title: "Envío gratis a todo el Perú",
    intro:
      "Disfruta de envío gratuito a nivel nacional cuando tu compra cumple con la siguiente condición.",
    bulletsTitle: "Condiciones",
    bullets: [
      "Compra mínima de S/ 250.00.",
      "Válido para todo el territorio nacional.",
      "Aplican los mismos términos y condiciones establecidos para los envíos nacionales.",
      "El envío gratuito se realiza mediante el servicio estándar.",
    ],
  },
  {
    id: "consideraciones",
    number: "04",
    shortTitle: "Consideraciones",
    title: "Consideraciones importantes",
    intro:
      "Algunas reglas transversales aplican a todos los envíos, independientemente de la modalidad seleccionada.",
    bullets: [
      "Es responsabilidad del cliente verificar que los datos de envío sean correctos antes de finalizar la compra.",
      "Púrpura Club no se responsabiliza por demoras ocasionadas por la empresa de transporte o por causas ajenas a nuestro control.",
      "Las tarifas y tiempos de entrega pueden modificarse durante campañas, fechas festivas o por disposiciones logísticas.",
    ],
    importantNote: {
      title: "Importante",
      body: "El costo de envío incluye un único intento de entrega. Si el pedido no puede ser recibido o no es posible establecer contacto con el destinatario, será necesario programar un nuevo envío, cuyo costo deberá ser asumido por el cliente.",
    },
  },
];

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      hero={{
        eyebrow: "Información de envíos",
        title: "Políticas de Envío",
        subtitleShort:
          "Tiempos de entrega, costos y condiciones para pedidos locales y nacionales.",
        subtitleLong:
          "Conoce nuestros tiempos de entrega, costos de envío y condiciones para pedidos locales y nacionales.",
      }}
      highlights={HIGHLIGHTS}
      highlightsShort={HIGHLIGHTS_SHORT}
      sections={SECTIONS}
    />
  );
}
