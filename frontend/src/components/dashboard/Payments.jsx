import { useMemo, useState } from "react";
import "./Payments.css";

/** MOCK (reemplazá con fetch a tu API) */
const MOCK = [
  {
    policyId: "POL-001",
    alias: "Terceros Daño Total",
    plate: "AA123BB",
    vehicle: "VW Gol 2018",
    status: "Activo",
    pending: [
      { id: "p1", concept: "Cuota 10/2025", dueDate: "2025-10-20", amount: 19500 },
      { id: "p2", concept: "Cuota 11/2025", dueDate: "2025-11-20", amount: 19500 },
    ],
    receipts: [
      { id: "r1", date: "2025-09-20", amount: 19000, method: "Mercado Pago", receiptNo: "A-38942" },
      { id: "r2", date: "2025-08-20", amount: 18500, method: "Transferencia", receiptNo: "T-99125" },
    ],
  },
  {
    policyId: "POL-002",
    alias: "Terceros Completo",
    plate: "AC456CD",
    vehicle: "Toyota Corolla 2020",
    status: "Activo",
    pending: [
      { id: "p3", concept: "Cuota 10/2025", dueDate: "2025-10-22", amount: 24700 },
    ],
    receipts: [
      { id: "r3", date: "2025-09-22", amount: 24700, method: "Débito automático", receiptNo: "D-12231" },
    ],
  },
];

function currency(n) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}
function isOverdue(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  d.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  return d < now;
}

export default function Payments() {
  // Selección por póliza: policyId -> Set(paymentId)
  const [selectedByPolicy, setSelectedByPolicy] = useState(() => {
    const map = new Map();
    MOCK.forEach(p => map.set(p.policyId, new Set()));
    return map;
  });
  // Expansión de comprobantes por póliza
  const [expanded, setExpanded] = useState(() => new Set());

  /** Toggle de comprobantes */
  const toggleReceipt = (policyId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(policyId) ? next.delete(policyId) : next.add(policyId);
      return next;
    });
  };

  /** Selección individual */
  const toggleOne = (policyId, payId) => {
    setSelectedByPolicy(prev => {
      const next = new Map(prev);
      const set = new Set(next.get(policyId));
      set.has(payId) ? set.delete(payId) : set.add(payId);
      next.set(policyId, set);
      return next;
    });
  };

  /** Seleccionar/Quitar todos los pendientes de una póliza */
  const toggleAll = (policyId, allIds) => {
    setSelectedByPolicy(prev => {
      const next = new Map(prev);
      const set = new Set(next.get(policyId));
      const allSelected = allIds.every(id => set.has(id));
      next.set(policyId, new Set(allSelected ? [] : allIds));
      return next;
    });
  };

  /** Listado global de seleccionados (cruza pólizas) */
  const globalSelected = useMemo(() => {
    const items = [];
    for (const policy of MOCK) {
      const set = selectedByPolicy.get(policy.policyId) || new Set();
      for (const item of policy.pending) {
        if (set.has(item.id)) {
          items.push({
            ...item,
            policyId: policy.policyId,
            policyAlias: policy.alias,
            plate: policy.plate,
          });
        }
      }
    }
    return items;
  }, [selectedByPolicy]);

  const globalTotal = useMemo(
    () => globalSelected.reduce((acc, it) => acc + it.amount, 0),
    [globalSelected]
  );

  /** Handler de pago global (varios seguros) */
  const payAllSelected = async () => {
    if (!globalSelected.length) return;
    // Ejemplo: agrupar por policyId antes de llamar al backend
    const grouped = globalSelected.reduce((acc, it) => {
      (acc[it.policyId] = acc[it.policyId] || []).push(it.id);
      return acc;
    }, {});
    // TODO: POST /api/payments/checkout-multi { items: [{policyId, paymentIds:[]}, ...] }
    // window.location.href = data.init_point;
    alert(
      "Vas a pagar:\n\n" +
      globalSelected.map(i => `• ${i.policyAlias} (${i.plate}) — ${i.concept} ${currency(i.amount)}`).join("\n") +
      `\n\nTotal: ${currency(globalTotal)}`
    );
  };

  return (
    <section className="payments">
      <header className="payments__header container">
        <h2>Pagos</h2>
        <p className="text-muted">
          Seleccioná cuotas pendientes de uno o varios seguros y pagalas juntas. Desplegá los comprobantes para ver pagos realizados.
        </p>
      </header>

      <div className="container payments__stack">
        {MOCK.map(policy => {
          const selectedSet = selectedByPolicy.get(policy.policyId) || new Set();
          const allIds = policy.pending.map(p => p.id);
          const allSelected = policy.pending.length > 0 && allIds.every(id => selectedSet.has(id));
          const isOpen = expanded.has(policy.policyId);

          return (
            <article key={policy.policyId} className="policy-card shadow-md">
              <header className="policy-head">
                <div>
                  <div className="policy-title">
                    {policy.alias}
                    <span className="policy-pill">{policy.status}</span>
                  </div>
                  <div className="policy-sub">
                    {policy.vehicle} • {policy.plate} • {policy.policyId}
                  </div>
                </div>
              </header>

              {/* PENDIENTES */}
              <section className="pending">
                <div className="pending__head">
                  <h3 className="section-title">Pendientes</h3>
                  <div className="pending__actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => toggleAll(policy.policyId, allIds)}
                      disabled={!policy.pending.length}
                    >
                      {allSelected ? "Quitar selección" : "Seleccionar todo"}
                    </button>
                  </div>
                </div>

                {policy.pending.length === 0 ? (
                  <div className="empty-row">No hay pagos pendientes para este seguro.</div>
                ) : (
                  <ul className="pending__list" role="list">
                    {policy.pending.map(item => {
                      const overdue = isOverdue(item.dueDate);
                      const checked = selectedSet.has(item.id);
                      return (
                        <li className="pending__row" key={item.id}>
                          <label className="row__check">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(policy.policyId, item.id)}
                              aria-label={`Seleccionar ${item.concept}`}
                            />
                            <span className="checkmark" aria-hidden="true" />
                          </label>

                          <div className="row__main">
                            <div className="row__title">{item.concept}</div>
                            <div className="row__meta">
                              Vence: <strong className={overdue ? "danger" : ""}>
                                {new Date(item.dueDate).toLocaleDateString()}
                              </strong>
                              {overdue && <span className="badge badge--danger">Vencido</span>}
                            </div>
                          </div>

                          <div className="row__amount">{currency(item.amount)}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* COMPROBANTES */}
              <section className="receipts">
                <button
                  type="button"
                  className="receipts__toggle"
                  onClick={() => toggleReceipt(policy.policyId)}
                  aria-expanded={isOpen ? "true" : "false"}
                  aria-controls={`rcp-${policy.policyId}`}
                >
                  {isOpen ? "Ocultar comprobantes" : "Ver comprobantes pagados"}
                  <svg width="18" height="18" viewBox="0 0 24 24" className={`chev ${isOpen ? "up" : ""}`} aria-hidden="true">
                    <path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>

                <div id={`rcp-${policy.policyId}`} className={`receipts__panel ${isOpen ? "is-open" : ""}`}>
                  {policy.receipts.length === 0 ? (
                    <div className="empty-row">No hay comprobantes para este seguro.</div>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Método</th>
                          <th>Nº comprobante</th>
                          <th className="t-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {policy.receipts.map(r => (
                          <tr key={r.id}>
                            <td>{new Date(r.date).toLocaleDateString()}</td>
                            <td>{r.method}</td>
                            <td>{r.receiptNo}</td>
                            <td className="t-right">{currency(r.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </article>
          );
        })}
      </div>

      {/* 🔵 Barra global fija de pago (fuera de los contenedores) */}
      <div className="paybar" role="region" aria-label="Pago global de seleccionados">
        <div className="paybar__info">
          {globalSelected.length === 0 ? (
            <span className="text-muted">No seleccionaste cuotas todavía.</span>
          ) : (
            <span>
              Seleccionados: <strong>{globalSelected.length}</strong> — Total: <strong>{currency(globalTotal)}</strong>
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={payAllSelected}
          disabled={globalSelected.length === 0}
          aria-disabled={globalSelected.length === 0}
        >
          Pagar seleccionados
        </button>
      </div>
    </section>
  );
}
