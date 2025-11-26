export function cleanPhone(p) {
  if (!p) return "";
  const raw = String(p).trim().replace(/\s|-/g, "");
  // si no tiene + y son dígitos, anteponer +
  if (!raw.startsWith("+") && /^\d+$/.test(raw)) return `+${raw}`;
  return raw;
}

export function buildWhatsAppLink(destNumber, message, opts = {}) {
  const phone = cleanPhone(destNumber).replace(/^\+/, ""); // wa.me usa sin '+'
  const text = encodeURIComponent(message || "");
  const { preferWeb, preferApi } = opts;

  // preferWeb: uso desktop; preferApi: uso móvil; fallback: wa.me
  if (preferWeb) return `https://web.whatsapp.com/send?phone=${phone}&text=${text}`;
  if (preferApi) return `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
  return `https://wa.me/${phone}?text=${text}`;
}
