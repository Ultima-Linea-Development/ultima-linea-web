/** +54 9 2604 63-8281 en formato internacional para wa.me */
export const WHATSAPP_E164 = "5492604638281";

/** Texto legible para mostrar en UI */
export const WHATSAPP_DISPLAY_NUMBER = "+54 9 2604 63-8281";

export const WHATSAPP_TEL_HREF = `tel:+${WHATSAPP_E164}`;

export function buildWhatsAppConsultUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_CONSULT_URL = buildWhatsAppConsultUrl(
  "Hola, quisiera hacer una consulta."
);

export const WHATSAPP_SIZE_GUIDE_URL = buildWhatsAppConsultUrl(
  "Hola, estoy entre dos talles y necesito ayuda para elegir el mío."
);

const WHATSAPP_ARREPENTIMIENTO_MESSAGE =
  "Hola, quiero ejercer mi derecho de arrepentimiento sobre mi compra. Por favor indiquen cómo proceder y qué datos necesitan.";

export const WHATSAPP_ARREPENTIMIENTO_URL =
  buildWhatsAppConsultUrl(WHATSAPP_ARREPENTIMIENTO_MESSAGE);
