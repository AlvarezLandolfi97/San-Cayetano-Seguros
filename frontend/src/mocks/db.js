export const db = {
  me: {
    id: 99,
    email: "admin@demo.com",
    first_name: "Admin",
    last_name: "Demo",
    is_admin: true,
    phone: "+54 9 221 555-0000",
  },

  users: [
    {
      id: 99,
      email: "admin@demo.com",
      first_name: "Admin",
      last_name: "Demo",
      is_admin: true,
      phone: "+54 9 221 555-0000",
    },
    {
      id: 1,
      email: "cliente@demo.com",
      first_name: "Cliente",
      last_name: "Demo",
      is_admin: false,
      phone: "+54 9 11 2222-3333",
    },
    {
      id: 2,
      email: "otro@demo.com",
      first_name: "Otro",
      last_name: "Usuario",
      is_admin: false,
      phone: "+54 9 11 4444-5555",
    },
  ],

  settings: {
    expiring_threshold_days: 7, // valor por defecto
  },

  products: [
    {
      id: 10,
      code: "PLAN_A",
      name: "Responsabilidad Civil (RC)",
      subtitle: "Cobertura básica obligatoria",
      bullets: ["Daños a terceros", "Asistencia vial"],
      is_active: true,
    },
    {
      id: 11,
      code: "PLAN_B",
      name: "Auto Total",
      subtitle: "Cobertura por pérdida total",
      bullets: ["PT por robo/incendio", "Asistencia 24/7"],
      is_active: true,
    },
    {
      id: 12,
      code: "PLAN_D",
      name: "Todo Riesgo",
      subtitle: "Cobertura integral",
      bullets: ["Daños parciales", "Franquicia configurable"],
      is_active: true,
    },
    {
      id: 13,
      code: "PLAN_P",
      name: "Mega Premium",
      subtitle: "Cobertura tope de gama",
      bullets: ["Auto sustituto", "Granizo sin tope"],
      is_active: true,
    },
  ],

  // === PÓLIZAS (mezcla: algunas por vencer, otras nuevas) ===
  policies: [
    {
      id: 101,
      number: "SC-000101",
      user_id: 1,
      product: { id: 12, code: "PLAN_D", name: "Todo Riesgo" },
      vehicle: {
        plate: "AB123CD",
        make: "Volkswagen",
        model: "Gol",
        version: "1.6",
        year: 2018,
        city: "La Plata",
        has_garage: true,
        usage: "privado",
      },
      premium: 24500,
      start_date: "2025-01-10",
      end_date: "2026-01-10",
      status: "active",
      claim_code: "VINCULA-101",
    },
    {
      id: 102,
      number: "SC-000102",
      user_id: 1,
      product: { id: 11, code: "PLAN_B", name: "Auto Total" },
      vehicle: {
        plate: "AE987FG",
        make: "Chevrolet",
        model: "Onix",
        version: "1.4 LT",
        year: 2019,
        city: "La Plata",
        has_garage: false,
        usage: "privado",
        has_gnc: true,
      },
      premium: 19800,
      start_date: "2024-12-15",   // vence pronto
      end_date: "2025-12-15",
      status: "active",
      claim_code: "VINCULA-102",
    },
    {
      id: 103,
      number: "SC-000103",
      user_id: null,
      product: { id: 10, code: "PLAN_A", name: "Responsabilidad Civil (RC)" },
      vehicle: {
        plate: "AC456ZZ",
        make: "Renault",
        model: "Kwid",
        version: "1.0",
        year: 2022,
        city: "Quilmes",
        has_garage: true,
        usage: "privado",
      },
      premium: 12000,
      start_date: "2024-11-10",   // vence en unos días
      end_date: "2025-11-10",
      status: "active",
      claim_code: "VINCULA-103",
    },
    {
      id: 104,
      number: "SC-000104",
      user_id: 2,
      product: { id: 13, code: "PLAN_P", name: "Mega Premium" },
      vehicle: {
        plate: "AF789GH",
        make: "Toyota",
        model: "Corolla",
        version: "XEi",
        year: 2021,
        city: "CABA",
        has_garage: true,
        usage: "comercial",
      },
      premium: 41000,
      start_date: "2024-12-01",   // vence en menos de 1 mes
      end_date: "2025-12-01",
      status: "active",
      claim_code: null,
    },
    {
      id: 105,
      number: "SC-000105",
      user_id: 2,
      product: { id: 10, code: "PLAN_A", name: "Responsabilidad Civil (RC)" },
      vehicle: {
        plate: "AG321MN",
        make: "Peugeot",
        model: "208",
        version: "Allure",
        year: 2020,
        city: "Berazategui",
        has_garage: false,
        usage: "privado",
      },
      premium: 15000,
      start_date: "2024-11-20",   // vence dentro de 12 días
      end_date: "2025-11-20",
      status: "active",
      claim_code: "VINCULA-105",
    },
  ],

  pendingByPolicy: {
    101: [{ id: 9001, concept: "Cuota 11/12", amount: 24500, due_date: "2025-11-10", status: "pending" }],
    102: [{ id: 9010, concept: "Cuota 10/12", amount: 19800, due_date: "2025-11-20", status: "pending" }],
    103: [{ id: 9020, concept: "Cuota 12/12", amount: 12000, due_date: "2025-11-30", status: "pending" }],
    104: [{ id: 9030, concept: "Cuota 11/12", amount: 41000, due_date: "2025-12-01", status: "pending" }],
    105: [{ id: 9040, concept: "Cuota 10/12", amount: 15000, due_date: "2025-11-18", status: "pending" }],
  },

  receiptsByPolicy: {
    101: [{ id: 7001, date: "2025-08-10", file_url: "/mock/receipt_7001.pdf" }],
    102: [{ id: 7002, date: "2025-07-05", file_url: "/mock/receipt_7002.pdf" }],
    103: [],
    104: [],
    105: [],
  },
};

/* === Helpers === */
export function markChargesPaid(ids = []) {
  for (const [pid, list] of Object.entries(db.pendingByPolicy)) {
    db.pendingByPolicy[pid] = list.map((c) =>
      ids.includes(c.id) ? { ...c, status: "paid" } : c
    );
  }
}

export function createReceiptForCharge(policy, charge, me = db.me) {
  if (!policy || !charge) return null;

  const todayISO = new Date().toISOString().slice(0, 10);
  const id = Math.floor(Math.random() * 1e9);

  const rec = {
    id,
    date: todayISO,
    client_no: policy.client_no || "3033",
    next_payment_day: policy.next_payment_day || {
      day: String(new Date(charge.due_date).getDate()).padStart(2, "0"),
      month: String(new Date(charge.due_date).getMonth() + 1).padStart(2, "0"),
      year: String(new Date(charge.due_date).getFullYear()).slice(-2),
    },
    producer: {
      name: "PRODUCTOR - ASESOR DE SEGUROS - DIAGONAL LOS POETAS 389 (BOSQUES) FCIO. VARELA",
      phone: "11-6033-0747",
      cuit: "27-21672285-5",
      ing_brutos: "27-21672285-5",
      start_activity: "26/04/99",
      email: "antoniosancayetano@hotmail.com",
    },
    payer_name:
      `${me?.last_name?.toUpperCase?.() || ""} ${me?.first_name?.toUpperCase?.() || ""}`.trim() ||
      me?.email ||
      "CLIENTE",
    amount_text: charge.amount_text || "",
    total_amount: Number(charge.amount),
    company: "P R O F",
    policy_number: policy.number || "—",
    vehicle: `${policy.vehicle?.make || ""} ${policy.vehicle?.model || ""} ${policy.vehicle?.version || ""}`.trim(),
    plate: policy.vehicle?.plate || "—",
    installment: charge.concept || "",
    currency: "PESOS",
    file_url: null,
  };

  if (!db.receiptsByPolicy[policy.id]) db.receiptsByPolicy[policy.id] = [];
  db.receiptsByPolicy[policy.id].unshift(rec);
  return rec;
}
