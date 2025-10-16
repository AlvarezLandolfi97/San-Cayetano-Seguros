// Limpia número a formato E.164
export function toE164(raw = "") {
  return String(raw).replace(/[^\d]/g, "");
}

// Crea un link de WhatsApp
export function buildWhatsAppUrl({ to, text }) {
  const phone = toE164(to);
  const encoded = encodeURIComponent(text || "");
  return `https://wa.me/${phone}?text=${encoded}`;
}
