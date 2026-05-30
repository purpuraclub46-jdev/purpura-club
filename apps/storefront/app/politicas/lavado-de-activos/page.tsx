"use client";

import {
  PolicyPage,
  type PolicySectionDef,
} from "@/features/policies/components/policy-shell";

/**
 * /politicas/lavado-de-activos — Política de Prevención de Lavado de
 * Activos y Financiamiento del Terrorismo.
 *
 * Mismo sistema visual editorial luxury que el resto de páginas
 * /politicas/*. La política está redactada conforme a la normativa
 * peruana vigente (SBS, UIF-Perú) y mejores prácticas internacionales
 * de cumplimiento.
 *
 * El tono es serio y profesional pero NO intimidante ni gubernamental:
 * el sistema visual lo encuadra como un documento institucional
 * elegante, no como una advertencia legal.
 */

const HIGHLIGHTS = [
  "Operaciones seguras",
  "Medios autorizados",
  "Cumplimiento normativo",
  "Protección al cliente",
];

const HIGHLIGHTS_SHORT = [
  "Operaciones seguras",
  "Medios autorizados",
  "Cumplimiento",
  "Protección",
];

const SECTIONS: PolicySectionDef[] = [
  {
    id: "compromiso-normativo",
    number: "01",
    shortTitle: "Compromiso",
    title: "Compromiso normativo",
    intro:
      "Púrpura Club mantiene un compromiso permanente con la prevención del lavado de activos y el financiamiento del terrorismo (PLAFT), alineado a la normativa vigente y a las mejores prácticas internacionales.",
    bullets: [
      "Cumplimos con la legislación peruana de prevención de lavado de activos y financiamiento del terrorismo.",
      "Operamos bajo los lineamientos establecidos por la Superintendencia de Banca, Seguros y AFP (SBS) y la Unidad de Inteligencia Financiera del Perú (UIF-Perú).",
      "Mantenemos políticas internas de cumplimiento que se actualizan periódicamente frente a cambios regulatorios.",
      "Promovemos una cultura organizacional orientada a la transparencia, la integridad y la legalidad en cada operación.",
    ],
  },
  {
    id: "identificacion-y-validacion",
    number: "02",
    shortTitle: "Identificación",
    title: "Identificación y validación",
    intro:
      "Para garantizar la trazabilidad de cada operación, solicitamos información que permita identificar de manera fehaciente a nuestros clientes.",
    bullets: [
      "Toda compra requiere datos completos del cliente: nombre, documento de identidad, contacto y dirección.",
      "En operaciones que lo ameriten, podremos requerir documentación adicional para validar la identidad o la actividad económica.",
      "Verificamos la consistencia y veracidad de los datos antes de procesar la operación.",
      "Los datos recopilados son tratados conforme a nuestra Política de Privacidad y la Ley N° 29733 de Protección de Datos Personales.",
    ],
  },
  {
    id: "operaciones-de-monto-elevado",
    number: "03",
    shortTitle: "Monto elevado",
    title: "Operaciones de monto elevado",
    intro:
      "Las operaciones que superen ciertos umbrales son objeto de una revisión adicional como parte de nuestro proceso de cumplimiento.",
    bullets: [
      "Las operaciones que superen los umbrales definidos por la regulación serán evaluadas de forma reforzada.",
      "Podremos solicitar sustento documental sobre el origen de los fondos cuando corresponda.",
      "Nos reservamos el derecho de no procesar operaciones que no cumplan con los estándares de transparencia y trazabilidad exigidos.",
      "La revisión de operaciones se ejecuta bajo criterios objetivos y sin discriminación alguna hacia el cliente.",
    ],
  },
  {
    id: "medios-de-pago",
    number: "04",
    shortTitle: "Medios de pago",
    title: "Medios de pago autorizados",
    intro:
      "Solo aceptamos medios de pago que ofrecen trazabilidad documental completa y respaldo institucional reconocido.",
    bulletsTitle: "Medios habilitados",
    bullets: [
      "Pagos procesados a través de Mercado Pago: tarjetas de crédito, débito, Yape y transferencias bancarias.",
      "No aceptamos efectivo en transacciones que requieran trazabilidad documental.",
      "No procesamos pagos provenientes de terceros que no guarden relación con el cliente registrado.",
      "No realizamos operaciones bajo modalidades que impidan identificar al titular real de los fondos.",
    ],
  },
  {
    id: "prevencion-y-monitoreo",
    number: "05",
    shortTitle: "Prevención",
    title: "Prevención y monitoreo",
    intro:
      "Disponemos de mecanismos internos de prevención y monitoreo permanente de las operaciones realizadas en la plataforma.",
    bullets: [
      "Monitoreamos las operaciones con criterios de detección de patrones inusuales o atípicos.",
      "Contamos con un sistema interno de alertas que permite identificar y evaluar comportamientos sospechosos.",
      "Capacitamos periódicamente al equipo en materia de cumplimiento normativo y buenas prácticas de prevención.",
      "Revisamos y actualizamos los procesos de cumplimiento de forma continua para responder a nuevos escenarios de riesgo.",
    ],
  },
  {
    id: "colaboracion-autoridades",
    number: "06",
    shortTitle: "Autoridades",
    title: "Colaboración con autoridades",
    intro:
      "Colaboramos activamente con las autoridades competentes en el marco de sus funciones de supervisión y fiscalización.",
    bullets: [
      "Atendemos los requerimientos de información formulados por autoridades competentes conforme a ley.",
      "Reportamos operaciones sospechosas a la UIF-Perú dentro de los plazos establecidos por la normativa.",
      "Conservamos los registros y documentación de las operaciones durante los plazos exigidos por la regulación vigente.",
      "Mantenemos canales internos de comunicación con el Oficial de Cumplimiento designado.",
    ],
  },
  {
    id: "reserva-de-derechos",
    number: "07",
    shortTitle: "Reserva",
    title: "Reserva de derechos",
    bullets: [
      "Púrpura Club se reserva el derecho de suspender, rechazar o cancelar operaciones que no cumplan con esta política o con la normativa vigente.",
      "La decisión de no procesar una operación por razones de cumplimiento no genera responsabilidad alguna para la empresa.",
      "No estamos obligados a comunicar al cliente o a terceros las razones operativas internas detrás de las decisiones de cumplimiento.",
      "Las medidas adoptadas en el marco de esta política buscan proteger a nuestros clientes, al equipo y a la integridad del servicio.",
    ],
    importantNote: {
      title: "Importante",
      body: "Las decisiones de cumplimiento se toman bajo criterios objetivos, sin que ello implique juicio alguno sobre la conducta o reputación del cliente.",
    },
  },
  {
    id: "disposicion-final",
    number: "08",
    shortTitle: "Disposición final",
    title: "Disposición final",
    bullets: [
      "Esta política puede actualizarse para reflejar cambios normativos o ajustes internos de cumplimiento.",
      "La versión vigente está siempre disponible en esta página.",
      "Al realizar una compra en Púrpura Club, el cliente reconoce y acepta los términos establecidos en esta política.",
      "Cualquier consulta o sugerencia puede dirigirse a nuestro canal de atención al cliente.",
    ],
  },
];

export default function AmlPolicyPage() {
  return (
    <PolicyPage
      hero={{
        eyebrow: "Transparencia y seguridad",
        title: "Política de Prevención de Lavado de Activos",
        subtitleShort:
          "Compromiso con la transparencia, la integridad y el cumplimiento normativo.",
        subtitleLong:
          "Nuestro compromiso con la transparencia, la integridad y el cumplimiento normativo.",
      }}
      highlights={HIGHLIGHTS}
      highlightsShort={HIGHLIGHTS_SHORT}
      sections={SECTIONS}
    />
  );
}
