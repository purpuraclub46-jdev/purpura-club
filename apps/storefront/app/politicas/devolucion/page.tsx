"use client";

import {
  PolicyPage,
  type PolicySectionDef,
} from "@/features/policies/components/policy-shell";

/**
 * /politicas/devolucion — Políticas de cambios y garantías.
 *
 * Toda la capa visual vive en `<PolicyPage>` (features/policies). Aquí
 * solo declaramos contenido y datos. Cualquier ajuste visual se hace en
 * el shell — esta página solo cambia el copy.
 */

const HIGHLIGHTS = [
  "14 días para solicitar cambios",
  "Presentar comprobante de compra",
  "Sin devoluciones de dinero",
  "Garantía por defectos de fabricación",
];

const HIGHLIGHTS_SHORT = [
  "14 días",
  "Comprobante",
  "Sin reembolso",
  "Garantía",
];

const SECTIONS: PolicySectionDef[] = [
  {
    id: "cambios",
    number: "01",
    shortTitle: "Cambios",
    title: "Cambios de producto",
    bullets: [
      "Dispones de hasta 14 días calendario desde la fecha de compra para solicitar un cambio.",
      "Para gestionar cualquier cambio será indispensable presentar el comprobante de compra correspondiente.",
      "El producto deberá encontrarse en perfectas condiciones, sin señales de uso, daños o alteraciones, y conservar su empaque original.",
      "Los cambios están sujetos a disponibilidad de stock.",
      "Los productos adquiridos en promociones, liquidaciones, ofertas especiales o en la sección SALE no tienen opción de cambio.",
      "No realizamos devoluciones de dinero bajo ninguna circunstancia.",
      {
        label:
          "Puedes cambiar tu producto por cualquier otro disponible en nuestra tienda física u online:",
        sub: [
          "Si el nuevo producto tiene un valor mayor, deberás abonar la diferencia.",
          "Si el nuevo producto tiene un valor menor, no se realizará reembolso ni devolución de la diferencia.",
        ],
      },
    ],
  },
  {
    id: "procedimiento",
    number: "02",
    shortTitle: "Procedimiento",
    title: "Procedimiento para solicitar un cambio",
    intro:
      "Para iniciar el proceso, deberás comunicarte con nuestro equipo de atención al cliente indicando:",
    bullets: [
      "Número de pedido o comprobante de compra.",
      "Motivo del cambio.",
      "Producto por el que deseas realizar el cambio.",
      "Una vez recibida la solicitud, te indicaremos los pasos a seguir según corresponda.",
    ],
  },
  {
    id: "garantia",
    number: "03",
    shortTitle: "Garantía",
    title: "Garantía por defectos de fabricación",
    intro:
      "Todos nuestros productos cuentan con garantía por defectos de fabricación. Si tu joya presenta una falla de fabricación dentro de los primeros 3 días calendario posteriores a la compra, evaluaremos el caso y, de corresponder, procederemos con el cambio sin costo adicional para el cliente.",
    exclusions: {
      title: "La garantía no cubre",
      items: [
        "Desgaste natural por uso.",
        "Daños ocasionados por golpes, caídas o manipulación inadecuada.",
        "Alteraciones provocadas por contacto con productos químicos, humedad o incumplimiento de las recomendaciones de cuidado.",
        "Variaciones normales de brillo o tonalidad propias del uso y del material.",
      ],
    },
  },
  {
    id: "consideraciones",
    number: "04",
    shortTitle: "Consideraciones",
    title: "Consideraciones importantes",
    bullets: [
      "Todos los cambios y garantías están sujetos a evaluación y disponibilidad de stock.",
      "PÚRPURA se reserva el derecho de rechazar solicitudes que no cumplan con las condiciones establecidas en esta política.",
      "No realizamos devoluciones de dinero bajo ninguna circunstancia.",
    ],
  },
];

export default function ReturnPolicyPage() {
  return (
    <PolicyPage
      hero={{
        eyebrow: "Políticas oficiales",
        title: "Cambios y Garantías",
        subtitleShort:
          "Cambios, garantías y condiciones de compra en Púrpura Club.",
        subtitleLong:
          "Toda la información que necesitas para gestionar cambios, garantías y condiciones de compra en Púrpura Club.",
      }}
      highlights={HIGHLIGHTS}
      highlightsShort={HIGHLIGHTS_SHORT}
      sections={SECTIONS}
    />
  );
}
