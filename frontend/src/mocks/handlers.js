// src/mocks/handlers.js
import { http, HttpResponse, delay } from "msw";
import { db, markChargesPaid, createReceiptForCharge } from "./db";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ---- helpers ----
function toNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function matchesSearch(policy, q) {
  if (!q) return true;
  const s = q.toString().toLowerCase().trim();
  const hay = [
    policy.number,
    policy.product?.name,
    policy.vehicle?.plate,
    policy.vehicle?.make,
    policy.vehicle?.model,
    policy.user?.email,
    policy.user?.first_name,
    policy.user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}
function genClaimCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "SC-";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const handlers = [
  // -------- Auth & User
  http.post(`${API}/auth/login`, async () => {
    await delay(400);
    return HttpResponse.json({
      access: "mock.token",
      refresh: "mock.refresh",
      user: db.me,
    });
  }),

  // Alias plural/singular para evitar mismatch
  http.get(`${API}/user/me`, async () => { await delay(200); return HttpResponse.json(db.me); }),
  http.get(`${API}/users/me`, async () => { await delay(200); return HttpResponse.json(db.me); }),
  http.patch(`${API}/user/me`, async ({ request }) => {
    const body = await request.json();
    db.me = { ...db.me, ...body };
    return HttpResponse.json(db.me);
  }),
  http.patch(`${API}/users/me`, async ({ request }) => {
    const body = await request.json();
    db.me = { ...db.me, ...body };
    return HttpResponse.json(db.me);
  }),

  // -------- Público: tipos de seguros (Home)
  http.get(`${API}/insurance-types`, async () => {
    await delay(300);
    return HttpResponse.json(db.products.filter((p) => p.is_active));
  }),

  // -------- Cliente: pólizas (listado breve)
  http.get(`${API}/policies/my`, async () => {
    await delay(300);
    const list = db.policies.filter((p) => p.user_id === db.me.id);
    return HttpResponse.json(
      list.map((p) => ({
        id: p.id,
        number: p.number,
        product: p.product.name,
        plate: p.vehicle.plate,
        premium: p.premium,
        status: p.status,
        start_date: p.start_date,
        end_date: p.end_date,
      }))
    );
  }),

  // === Admin Settings (umbral de “próximo a vencer”) ===
http.get(`${API}/admin/settings`, async () => {
  return HttpResponse.json(db.settings);
}),
http.patch(`${API}/admin/settings`, async ({ request }) => {
  const body = await request.json();
  const n = Number(body?.expiring_threshold_days);
  if (Number.isFinite(n) && n > 0) {
    db.settings.expiring_threshold_days = n;
  }
  return HttpResponse.json(db.settings);
}),


  // -------- Cliente: póliza (detalle completo)
  http.get(`${API}/policies/:id`, async ({ params }) => {
    await delay(250);
    const { id } = params;
    const p = db.policies.find((x) => String(x.id) === String(id));
    if (!p) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({
      id: p.id,
      number: p.number,
      status: p.status,
      premium: p.premium,
      start_date: p.start_date,
      end_date: p.end_date,
      product: p.product?.name,
      plate: p.vehicle?.plate,
      vehicle: {
        make: p.vehicle?.make,
        model: p.vehicle?.model,
        version: p.vehicle?.version,
        year: p.vehicle?.year,
      },
      city: p.vehicle?.city,
      has_garage: p.vehicle?.has_garage,
      is_zero_km: p.vehicle?.is_zero_km,
      usage: p.vehicle?.usage,
      has_gnc: p.vehicle?.has_gnc,
      gnc_amount: p.vehicle?.gnc_amount,
      claim_code: p.claim_code || null,
      user: p.user_id ? db.users.find((u) => u.id === p.user_id) : null,
    });
  }),

  http.get(`${API}/policies/:id/receipts`, async ({ params }) => {
    await delay(250);
    const { id } = params;
    return HttpResponse.json(db.receiptsByPolicy[id] || []);
  }),

  // Asociar póliza por código (usuario reclama su póliza)
  http.post(`${API}/policies/claim`, async ({ request }) => {
    await delay(250);
    const { code } = await request.json();
    const pol = db.policies.find((p) => p.claim_code === code);
    if (!pol) {
      return new HttpResponse(
        JSON.stringify({ detail: "Código inválido o ya utilizado." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    pol.user_id = db.me.id;
    return HttpResponse.json({ message: "¡Póliza asociada!" });
  }),

  // -------- Cliente: pagos
  http.get(`${API}/payments/pending`, async ({ request }) => {
    await delay(250);
    const url = new URL(request.url);
    const policyId = url.searchParams.get("policy_id");
    const list = db.pendingByPolicy[policyId] || [];
    return HttpResponse.json(list.filter((c) => c.status === "pending"));
  }),

  // “Marcar pagados” + generar recibo mock
  http.post(`${API}/payments/mp/preference`, async ({ request }) => {
    await delay(500);
    const { charge_ids = [] } = await request.json();

    markChargesPaid(charge_ids);

    charge_ids.forEach((cid) => {
      let policyId = null;
      let chargeObj = null;
      for (const [pid, list] of Object.entries(db.pendingByPolicy)) {
        const hit = list.find((c) => String(c.id) === String(cid));
        if (hit) { policyId = Number(pid); chargeObj = hit; break; }
      }
      if (!policyId || !chargeObj) return;
      const policy = db.policies.find((p) => p.id === policyId);
      if (!policy) return;
      createReceiptForCharge(policy, chargeObj, db.me);
    });

    return HttpResponse.json({ init_point: "https://www.mercadopago.com/init-point/mock" });
  }),

  // -------- Admin: productos / planes (CRUD simple)
  http.get(`${API}/admin/insurance-types`, async () => HttpResponse.json(db.products)),
  http.post(`${API}/admin/insurance-types`, async ({ request }) => {
    const body = await request.json();
    const id = (Math.max(0, ...db.products.map((p) => p.id)) || 0) + 1;
    const item = { id, ...body };
    db.products.push(item);
    return HttpResponse.json(item);
  }),
  http.patch(`${API}/admin/insurance-types/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    db.products = db.products.map((p) => (String(p.id) === String(id) ? { ...p, ...body } : p));
    return HttpResponse.json(db.products.find((p) => String(p.id) === String(id)));
  }),
  http.delete(`${API}/admin/insurance-types/:id`, async ({ params }) => {
    const { id } = params;
    db.products = db.products.filter((p) => String(p.id) !== String(id));
    return HttpResponse.json({ ok: true });
  }),

  // -------- Admin: usuarios (CRUD básico)
  http.get(`${API}/admin/users`, async () => HttpResponse.json(db.users)),
  http.post(`${API}/admin/users`, async ({ request }) => {
    const body = await request.json();
    const id = (Math.max(0, ...db.users.map((u) => u.id)) || 0) + 1;
    const user = { id, is_admin: false, ...body };
    db.users.push(user);
    return HttpResponse.json(user);
  }),
  http.patch(`${API}/admin/users/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    db.users = db.users.map((u) => (String(u.id) === String(id) ? { ...u, ...body } : u));
    const updated = db.users.find((u) => String(u.id) === String(id));
    // si estás editando al que está logueado, reflejalo en db.me
    if (updated && updated.id === db.me.id) db.me = { ...db.me, ...updated };
    return HttpResponse.json(updated);
  }),
  http.delete(`${API}/admin/users/:id`, async ({ params }) => {
    const { id } = params;
    db.users = db.users.filter((u) => String(u.id) !== String(id));
    return HttpResponse.json({ ok: true });
  }),

  // -------- Admin: PÓLIZAS (CRUD + búsqueda + paginación + claim code)
http.get(`${API}/admin/policies`, async ({ request }) => {
  await delay(250);
  const url = new URL(request.url);
  const q = url.searchParams.get("search") || "";
  const onlyUnassigned = ["1", "true", "yes", "si"].includes(
    (url.searchParams.get("only_unassigned") || "").toLowerCase()
  );
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.max(1, Number(url.searchParams.get("page_size") || 10));

  const decorate = (p) => ({
    ...p,
    user: p.user_id ? db.users.find((u) => u.id === p.user_id) : null,
  });

  let list = db.policies.slice();
  if (q) list = list.filter((p) => decorate(p).number.includes(q));
  if (onlyUnassigned) list = list.filter((p) => !p.user_id);

  const count = list.length;
  const start = (page - 1) * pageSize;
  const results = list.slice(start, start + pageSize).map(decorate);

  return HttpResponse.json({ results, count, page, page_size: pageSize });
}),


  http.post(`${API}/admin/policies`, async ({ request }) => {
    await delay(250);
    const body = await request.json();

    const id = (Math.max(0, ...db.policies.map((p) => p.id)) || 0) + 1;
    const product = db.products.find((pr) => String(pr.id) === String(body.product_id));
    const policy = {
      id,
      number: body.number || `SC-${String(id).padStart(6, "0")}`,
      status: body.status || "active",
      premium: toNum(body.premium, 0),
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      product: product ? { id: product.id, name: product.name } : null,
      vehicle: {
        plate: body.vehicle?.plate || "",
        make: body.vehicle?.make || "",
        model: body.vehicle?.model || "",
        version: body.vehicle?.version || "",
        year: body.vehicle?.year || "",
        city: body.vehicle?.city || "",
        has_garage: !!body.vehicle?.has_garage,
        is_zero_km: !!body.vehicle?.is_zero_km,
        usage: body.vehicle?.usage || "privado",
        has_gnc: !!body.vehicle?.has_gnc,
        gnc_amount: body.vehicle?.has_gnc ? toNum(body.vehicle?.gnc_amount, 0) : null,
      },
      user_id: body.user_id || null,
      claim_code: body.claim_code || genClaimCode(),
    };

    db.policies.push(policy);
    return HttpResponse.json(policy);
  }),

  http.patch(`${API}/admin/policies/:id`, async ({ params, request }) => {
    await delay(250);
    const { id } = params;
    const body = await request.json();
    const idx = db.policies.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });

    const prev = db.policies[idx];
    const product = body.product_id
      ? db.products.find((pr) => String(pr.id) === String(body.product_id))
      : prev.product;

    const next = {
      ...prev,
      number: body.number ?? prev.number,
      status: body.status ?? prev.status,
      premium: body.premium !== undefined ? toNum(body.premium, prev.premium) : prev.premium,
      start_date: body.start_date ?? prev.start_date,
      end_date: body.end_date ?? prev.end_date,
      product: product ? { id: product.id, name: product.name } : null,
      user_id: body.user_id !== undefined ? body.user_id : prev.user_id,
      vehicle: {
        ...prev.vehicle,
        ...body.vehicle,
        has_garage: body?.vehicle?.has_garage ?? prev.vehicle?.has_garage,
        is_zero_km: body?.vehicle?.is_zero_km ?? prev.vehicle?.is_zero_km,
        has_gnc: body?.vehicle?.has_gnc ?? prev.vehicle?.has_gnc,
        gnc_amount:
          (body?.vehicle?.has_gnc ? toNum(body?.vehicle?.gnc_amount, prev.vehicle?.gnc_amount || 0) : null) ??
          prev.vehicle?.gnc_amount,
      },
    };

    db.policies[idx] = next;
    return HttpResponse.json(next);
  }),

  http.delete(`${API}/admin/policies/:id`, async ({ params }) => {
    await delay(250);
    const { id } = params;
    const idx = db.policies.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    db.policies[idx] = { ...db.policies[idx], status: "inactive" };
    return HttpResponse.json(db.policies[idx]);
  }),

  http.post(`${API}/admin/policies/:id/generate-code`, async ({ params }) => {
    await delay(200);
    const { id } = params;
    const p = db.policies.find((x) => String(x.id) === String(id));
    if (!p) return new HttpResponse(null, { status: 404 });
    p.claim_code = genClaimCode();
    return HttpResponse.json({ claim_code: p.claim_code });
  }),

  // -------- Bulk adjust por selección (se mantiene)
  http.post(`${API}/admin/policies/bulk-adjust`, async ({ request }) => {
    const { policy_ids = [], mode, value } = await request.json();
    db.policies = db.policies.map((p) => {
      if (policy_ids.includes(p.id)) {
        const inc = mode === "percent" ? p.premium * (value / 100) : value;
        return { ...p, premium: Math.round((p.premium + inc) * 100) / 100 };
      }
      return p;
    });
    return HttpResponse.json({ ok: true });
  }),

  // ⚠️ Eliminado: ajuste por tipo de seguro (/admin/insurance-types/:id/adjust-prices)
];
