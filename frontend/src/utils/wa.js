export function cleanPhone(p) {
  if (!p) return "";
  const raw = String(p).trim().replace(/\s|-/g, "");
  // si no tiene + y son dígitos, anteponer +
  if (!raw.startsWith("+") && /^\d+$/.test(raw)) return `+${raw}`;
  return raw;
}

export function buildWhatsAppLink(destNumber, message) {
  const phone = cleanPhone(destNumber).replace(/^\+/, ""); // wa.me usa sin '+'
  const text = encodeURIComponent(message || "");
  // Si querés usar API oficial de wa (con app o web), podés cambiar wa.me por api.whatsapp.com/send
  return `https://wa.me/${phone}?text=${text}`;
}
