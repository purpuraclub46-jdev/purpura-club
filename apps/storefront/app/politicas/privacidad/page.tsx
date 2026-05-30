"use client";

import {
  PolicyPage,
  type PolicySectionDef,
} from "@/features/policies/components/policy-shell";

/**
 * /politicas/privacidad — Política de Privacidad.
 *
 * Mismo sistema visual editorial luxury (shell compartido). Aquí solo
 * declaramos contenido. La política está redactada conforme a la Ley de
 * Protección de Datos Personales del Perú (Ley N° 29733) y mejores
 * prácticas de e-commerce.
 */

const HIGHLIGHTS = [
  "Protección de datos",
  "Pagos seguros",
  "Privacidad garantizada",
  "Comunicaciones controladas",
];

const HIGHLIGHTS_SHORT = [
  "Datos protegidos",
  "Pagos seguros",
  "Privacidad",
  "Sin spam",
];

const SECTIONS: PolicySectionDef[] = [
  {
    id: "informacion-recopilada",
    number: "01",
    shortTitle: "Información",
    title: "Información que recopilamos",
    intro:
      "Para brindarte una experiencia de compra completa, solicitamos únicamente los datos necesarios para procesar tus pedidos y mantenerte informado.",
    bulletsTitle: "Datos que solicitamos",
    bullets: [
      "Datos de identificación: nombre completo, documento de identidad y, cuando corresponda, RUC.",
      "Datos de contacto: correo electrónico, número telefónico y dirección de entrega.",
      "Datos de compra: productos adquiridos, montos, comprobantes y modalidad de pago.",
      "Datos de navegación: dirección IP, tipo de dispositivo, navegador y comportamiento dentro de la plataforma.",
    ],
  },
  {
    id: "finalidad",
    number: "02",
    shortTitle: "Finalidad",
    title: "Finalidad del tratamiento",
    intro:
      "Toda la información recopilada se utiliza exclusivamente para los fines descritos a continuación.",
    bullets: [
      "Procesar pedidos, emitir comprobantes electrónicos y gestionar entregas.",
      "Atender consultas, reclamos y solicitudes de cambio o garantía.",
      "Personalizar tu experiencia de compra y mostrarte recomendaciones relevantes.",
      "Enviar comunicaciones comerciales únicamente cuando otorgues tu consentimiento.",
      "Cumplir con obligaciones legales, contables y tributarias aplicables.",
      "Prevenir fraudes y proteger la seguridad de la plataforma y sus usuarios.",
    ],
  },
  {
    id: "proteccion",
    number: "03",
    shortTitle: "Protección",
    title: "Protección de datos",
    intro:
      "Aplicamos medidas técnicas, administrativas y organizativas para resguardar tu información frente a accesos no autorizados, pérdidas o usos indebidos.",
    bullets: [
      "Almacenamiento en servidores con cifrado en tránsito y en reposo.",
      "Accesos restringidos por roles y permisos internos auditados.",
      "Protocolos de respuesta ante incidentes y revisiones periódicas de seguridad.",
      "Conservamos tus datos únicamente durante el tiempo necesario para cumplir la finalidad o lo exigido por ley.",
    ],
  },
  {
    id: "comparticion",
    number: "04",
    shortTitle: "Compartición",
    title: "Compartición de información",
    intro:
      "Tu información nunca se vende ni se cede con fines comerciales. Solo la compartimos cuando es indispensable para cumplir tu pedido o cuando la ley lo exige.",
    bullets: [
      "Procesadores de pago autorizados, bajo acuerdos de confidencialidad y estándares de seguridad.",
      "Empresas de transporte que ejecutan la entrega de los pedidos.",
      "Autoridades tributarias, judiciales o regulatorias cuando exista un requerimiento legal expreso.",
      "En ningún caso compartimos tus datos con terceros para campañas de marketing externas.",
    ],
  },
  {
    id: "cookies",
    number: "05",
    shortTitle: "Cookies",
    title: "Uso de cookies",
    intro:
      "Utilizamos cookies y tecnologías similares para mejorar tu experiencia, recordar tus preferencias y entender cómo se utiliza la plataforma.",
    bulletsTitle: "Tipos de cookies",
    bullets: [
      {
        label: "Cookies técnicas — necesarias para el funcionamiento del sitio:",
        sub: [
          "Sesión activa y autenticación.",
          "Carrito de compras y proceso de checkout.",
        ],
      },
      {
        label: "Cookies analíticas — uso anonimizado para mejorar la plataforma:",
        sub: [
          "Análisis de tráfico y rendimiento.",
          "Detección de errores y oportunidades de mejora.",
        ],
      },
      {
        label: "Cookies de personalización — adaptan la experiencia a tu uso:",
        sub: [
          "Recomendaciones según historial de navegación.",
          "Preferencias visuales y de comunicación.",
        ],
      },
      "Puedes administrar o bloquear las cookies desde la configuración de tu navegador. Algunas funcionalidades podrían verse limitadas si decides deshabilitarlas.",
    ],
  },
  {
    id: "comunicaciones",
    number: "06",
    shortTitle: "Comunicaciones",
    title: "Comunicaciones comerciales",
    bullets: [
      "Únicamente enviamos campañas comerciales cuando otorgas tu consentimiento expreso.",
      "Puedes darte de baja en cualquier momento desde el enlace ubicado al pie de cada correo.",
      "También puedes actualizar tus preferencias desde la sección Mi cuenta.",
      "Las comunicaciones transaccionales (confirmación de pedido, envío, soporte) no requieren consentimiento adicional y forman parte del servicio.",
    ],
  },
  {
    id: "pagos-seguros",
    number: "07",
    shortTitle: "Pagos",
    title: "Pagos seguros",
    intro:
      "Todos los pagos en Púrpura Club se procesan a través de Mercado Pago, plataforma certificada bajo estándares internacionales de seguridad.",
    bullets: [
      "Púrpura Club no almacena en ningún momento los datos de tu tarjeta de crédito o débito.",
      "El procesador opera bajo estándares PCI DSS y cifrado de extremo a extremo.",
      "Las transacciones cuentan con sistemas de detección antifraude y verificación 3D Secure cuando corresponde.",
    ],
    importantNote: {
      title: "Importante",
      body: "Si detectas un cargo no reconocido o tienes dudas sobre una transacción, comunícate con nuestro equipo de atención al cliente de inmediato.",
    },
  },
  {
    id: "derechos",
    number: "08",
    shortTitle: "Derechos",
    title: "Derechos del usuario",
    intro:
      "Conforme a la Ley N° 29733, puedes ejercer los siguientes derechos sobre tus datos personales en cualquier momento.",
    bullets: [
      {
        label: "Derechos ARCO que puedes ejercer:",
        sub: [
          "Acceso: consultar qué datos almacenamos sobre ti.",
          "Rectificación: solicitar la corrección de información inexacta o desactualizada.",
          "Cancelación: solicitar la eliminación de tus datos cuando proceda legalmente.",
          "Oposición: oponerte al tratamiento de tus datos para fines específicos.",
        ],
      },
      "Para ejercer cualquiera de estos derechos, escríbenos a hola@purpura.club.pe indicando tu solicitud y un medio de validación de identidad.",
      "Atendemos las solicitudes dentro de los plazos establecidos por la normativa vigente.",
    ],
  },
  {
    id: "responsabilidad",
    number: "09",
    shortTitle: "Responsabilidad",
    title: "Responsabilidad del usuario",
    bullets: [
      "Mantener actualizados los datos personales y de contacto registrados en la plataforma.",
      "Resguardar la confidencialidad de las credenciales de acceso a tu cuenta.",
      "Notificar de inmediato cualquier uso no autorizado o sospecha de vulneración de tu cuenta.",
      "Utilizar la plataforma de forma responsable y conforme a los términos y condiciones del servicio.",
    ],
  },
  {
    id: "modificaciones",
    number: "10",
    shortTitle: "Modificaciones",
    title: "Modificaciones de la política",
    bullets: [
      "Esta política puede actualizarse para reflejar cambios normativos, mejoras del servicio o nuevas funcionalidades.",
      "La versión vigente está siempre disponible en esta página.",
      "Te notificaremos cuando se realicen modificaciones sustanciales que afecten el tratamiento de tus datos.",
    ],
  },
  {
    id: "contacto",
    number: "11",
    shortTitle: "Contacto",
    title: "Contacto",
    intro:
      "Si tienes consultas sobre el tratamiento de tus datos personales o deseas ejercer tus derechos, puedes comunicarte con nosotros por los siguientes canales.",
    bullets: [
      "Correo electrónico: hola@purpura.club.pe",
      "Canal de atención disponible desde la sección de ayuda en nuestra plataforma.",
      "Atendemos consultas dentro de los plazos previstos por la Ley N° 29733 de Protección de Datos Personales.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      hero={{
        eyebrow: "Privacidad y seguridad",
        title: "Política de Privacidad",
        subtitleShort:
          "Cómo protegemos, utilizamos y almacenamos tu información personal.",
        subtitleLong:
          "Conoce cómo protegemos, utilizamos y almacenamos tu información personal.",
      }}
      highlights={HIGHLIGHTS}
      highlightsShort={HIGHLIGHTS_SHORT}
      sections={SECTIONS}
    />
  );
}
