// src/components/quote/WhatsAppLink.js
export function buildWhatsAppLink({ toNumber, payload }) {
  // Limpia: solo dígitos para wa.me
  const num = String(toNumber || "").replace(/\D/g, "");
  const lines = [];

  lines.push("*Nueva cotización solicitada*");
  lines.push("");
  lines.push(`*Contacto (WhatsApp):* +${num}`);
  lines.push("*Datos del vehículo:*");
  lines.push(`- Marca: ${payload.brand || "-"}`);
  lines.push(`- Modelo: ${payload.model || "-"}`);
  lines.push(`- Versión: ${payload.version || "-"}`);
  lines.push(`- Año: ${payload.year || "-"}`);
  lines.push(`- Localidad: ${payload.location || "-"}`);
  lines.push(`- Guarda en garage: ${payload.garage ? "Sí" : "No"}`);
  lines.push(`- Cero KM: ${payload.zeroKm ? "Sí" : "No"}`);
  lines.push(`- Uso: ${payload.usage || "-"}`);
  lines.push(`- GNC: ${payload.gnc ? `Sí (monto: ${payload.gnc_amount ?? "-"})` : "No"}`);

  // Adjuntar links de fotos (data URLs si no hay backend/CDN)
  if (payload.photos) {
    lines.push("");
    lines.push("*Fotos del vehículo:*");
    ["front", "back", "right", "left"].forEach((k) => {
      const url = payload.photos[k];
      if (url) lines.push(`- ${k}: ${url}`);
    });
  }

  // Además: incluimos el "link de cotización" (querystring)
  const qs = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v == null) return;
    if (k === "photos") return; // fotos ya arriba
    qs.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  });
  const quoteLink = `${location.origin}/quote?${qs.toString()}`;

  lines.push("");
  lines.push(`*Link de cotización (autocompleta):* ${quoteLink}`);

  const text = encodeURIComponent(lines.join("\n"));
  // Puedes alternar por: https://api.whatsapp.com/send?phone=
  return `https://wa.me/${num}?text=${text}`;
}
