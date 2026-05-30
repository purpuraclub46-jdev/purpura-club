"use client";

import {
  PolicyPage,
  type PolicySectionDef,
} from "@/features/policies/components/policy-shell";

/**
 * /tips-joyas — Guía de cuidado para joyas.
 *
 * Misma capa visual editorial luxury que el resto de páginas /politicas/*,
 * pero con `marker="check"` para reforzar el tono "guía de cuidado"
 * tipo Apple Care / Cartier Care Guide / Tiffany Care. Cada tip se
 * muestra como check editorial brand en lugar del dash legal.
 *
 * Estructura intencionalmente reducida (2 secciones) — la página vive
 * más del contenido editorial que de la navegación.
 */

const HIGHLIGHTS = [
  "Evita químicos y perfumes",
  "Protege del agua y la humedad",
  "Guarda cada pieza por separado",
  "Limpieza suave y regular",
];

const HIGHLIGHTS_SHORT = [
  "Sin químicos",
  "Sin humedad",
  "Guardado correcto",
  "Limpieza regular",
];

const SECTIONS: PolicySectionDef[] = [
  {
    id: "acero-y-banadas-en-oro",
    number: "01",
    shortTitle: "Acero y oro",
    title: "Joyas de acero y bañadas en oro",
    intro:
      "Las piezas de acero quirúrgico y bañadas en oro mantienen su brillo y color por más tiempo si las cuidas con estos hábitos sencillos.",
    bulletsTitle: "Cuidados diarios",
    bullets: [
      "Evita el contacto directo con perfumes, cremas, maquillaje y productos de limpieza.",
      "Quítate la joya antes de bañarte, ingresar al mar, a piscinas o entrenar en el gimnasio.",
      "Sécala con un paño suave después de cada uso para retirar restos de sudor o humedad.",
      "Guárdala en su bolsa o estuche original, en un lugar seco y alejado de la luz directa.",
      "Evita golpes y caídas sobre superficies duras: pueden dañar el acabado del baño.",
      "Pon la joya como último paso al vestirte y retírala antes de dormir.",
    ],
    importantNote: {
      title: "Recomendación",
      body: "Si notas pérdida de brillo, limpia la pieza únicamente con un paño suave y seco. Evita líquidos limpiadores agresivos o cepillos que puedan rayar el baño.",
    },
  },
  {
    id: "plata",
    number: "02",
    shortTitle: "Plata",
    title: "Joyas de plata",
    intro:
      "La plata es un material noble que requiere cuidados específicos para conservar su brillo característico y prevenir la oxidación natural del metal.",
    bulletsTitle: "Cuidados diarios",
    bullets: [
      "Limpia la pieza con un paño de microfibra después de cada uso.",
      "Evita el contacto con agua salada, cloro, productos químicos y cosméticos.",
      "No la uses al dormir, hacer deporte o realizar tareas del hogar.",
      "Guarda cada pieza por separado en una bolsa anti-óxido o estuche revestido en tela.",
      "Si la plata pierde brillo, restaura con un paño limpiador especial para plata.",
      "Ponte la joya como último paso al vestirte y quítala antes de bañarte o nadar.",
    ],
    importantNote: {
      title: "Sobre la oxidación",
      body: "La oxidación natural de la plata es un fenómeno propio del material y no constituye un defecto de fabricación. Con los cuidados adecuados, tus piezas pueden conservar su brillo original durante años.",
    },
  },
];

export default function JewelryCareGuidePage() {
  return (
    <PolicyPage
      hero={{
        eyebrow: "Guía de cuidado",
        title: "Tips para cuidar tus joyas",
        subtitleShort:
          "Pequeños cuidados para conservar la belleza y brillo de tus piezas por más tiempo.",
        subtitleLong:
          "Pequeños cuidados que ayudarán a conservar la belleza y brillo de tus piezas por más tiempo.",
      }}
      highlights={HIGHLIGHTS}
      highlightsShort={HIGHLIGHTS_SHORT}
      sections={SECTIONS}
      marker="check"
    />
  );
}
