import { api } from "../api";

/**
 * Crea preferencia en backend.
 * El backend actual puede devolver:
 *  - { mp_preference_id, payment_id }  (sin init_point)
 *  - { preference_id, init_point, payment_id }  (ideal)
 * @param {number|string} policyId - id de la póliza
 * @param {string|null} period - AAAAMM (ej: 202503)
 * @param {Array<number>|null} chargeIds - ids de cargos pendientes (opcional, para que el backend use su monto)
 */
export async function createPreference(policyId, period, chargeIds = []) {
  const payload = { period };
  if (Array.isArray(chargeIds) && chargeIds.length > 0) payload.charge_ids = chargeIds;
  const { data } = await api.post(`/payments/policies/${policyId}/create_preference`, payload);

  // Normalizamos respuesta
  const preferenceId = data.preference_id || data.mp_preference_id || data.pref_id || null;
  const paymentId = data.payment_id ?? data.id ?? null;
  let initPoint = data.init_point || null;

  // Fallback: si no viene init_point, lo armamos (stub usado por tu backend)
  if (!initPoint && preferenceId) {
    initPoint = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(preferenceId)}`;
  }

  if (!preferenceId || !initPoint) {
    throw new Error("No se pudo obtener la preferencia de pago.");
  }
  return { preferenceId, initPoint, paymentId };
}

/**
 * (Opcional) Intenta listar pagos por policy si el endpoint existe.
 * Si 403/404, devolvemos [] y ocultamos la UI de comprobantes.
 */
export async function tryListPaymentsByPolicy(policyId) {
  try {
    const { data } = await api.get(`/payments`, { params: { policy: policyId } });
    return Array.isArray(data) ? data : (data?.results || []);
  } catch (e) {
    return [];
  }
}

/**
 * (Opcional) Intenta leer un pago por id (puede estar prohibido para dueños en el backend actual).
 */
export async function tryGetPayment(paymentId) {
  try {
    const { data } = await api.get(`/payments/${paymentId}`);
    return data;
  } catch {
    return null;
  }
}
