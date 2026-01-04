import { api } from "@/api";

function normalizePolicy(raw = {}) {
  const fallbackId = `pol-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const id = raw.id ?? raw.policy_id ?? raw.number ?? fallbackId;
  const adjustmentFrom = raw.adjustment_from || raw.adjustmentFrom || null;
  const adjustmentTo = raw.adjustment_to || raw.adjustmentTo || null;

  return {
    id: String(id),
    number:
      raw.number ||
      raw.policyNumber ||
      (typeof raw.id !== "undefined" ? `POL-${String(raw.id).padStart(6, "0")}` : ""),
    product: raw.product?.name || raw.product_name || raw.product || "Seguro",
    plate: raw.plate || raw.vehicle?.plate || raw.vehiclePlate || "",
    status: raw.status || "active",
    premium: raw.premium ?? null,
    startDate: raw.start_date || raw.startDate || null,
    endDate: raw.client_end_date || raw.end_date || raw.endDate || null,
    paymentStartDate: raw.payment_start_date || raw.paymentStartDate || null,
    paymentEndDate: raw.payment_end_date || raw.paymentEndDate || null,
    adjustmentFrom,
    adjustmentTo,
  };
}

/**
 * Lista las pólizas asociadas al usuario autenticado.
 */
export async function getPolicies() {
  const { data } = await api.get("/policies/my");
  const list = Array.isArray(data?.results) ? data.results : data;
  if (!Array.isArray(list)) return [];
  return list.map(normalizePolicy);
}

/**
 * Lee una póliza por id (detalle).
 */
export async function getPolicy(id) {
  if (!id) return null;
  const { data } = await api.get(`/policies/${id}`);
  return normalizePolicy(data);
}

export { normalizePolicy };
