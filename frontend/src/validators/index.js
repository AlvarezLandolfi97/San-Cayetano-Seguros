// Patente Argentina: AA123BB o ABC123
export function isPlate(ar) {
  const v = (ar || "").toUpperCase().trim();
  return /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(v) || /^[A-Z]{3}\d{3}$/.test(v);
}

export function normPlate(ar) {
  return (ar || "").toUpperCase().replace(/\s+/g, "");
}

// DNI: 7-8 dígitos. Para verificación pedimos últimos 4.
export function isDniLast4(x) {
  return /^\d{4}$/.test((x || "").trim());
}

export function isEmail(x) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((x || "").trim());
}

export function isStrongPassword(p) {
  return typeof p === "string" && p.length >= 6;
}
