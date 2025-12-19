import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { api } from "@/api";
import { createPreference } from "@/services/payments";
import ReceiptTicket from "@/components/receipts/ReceiptTicket";
import "@/pages/dashboard/dashboard.css";

export default function Payments() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [paying, setPaying] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const policyRefs = useRef({});

  const statusLabel = (status) =>
    ({
      active: "Activa",
      no_coverage: "Sin cobertura",
      expired: "Vencida",
      suspended: "Suspendida",
      cancelled: "Cancelada",
      inactive: "Inactiva",
    }[status] || "—");

  const paymentWindow = (policy) => {
    const start = policy.payment_start_date;
    const end = policy.payment_end_date || policy.client_end_date || policy.end_date;
    if (start && end) return `${start} → ${end}`;
    if (start) return start;
    return end || "—";
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: policies } = await api.get("/policies/my");

        const packs = await Promise.all(
          (policies || []).map(async (p) => {
            let detail = null;
            let pending = [];
            let receipts = [];
            let pendingError = "";
            let pendingHint = "";

            const [detRes, pendRes, recRes] = await Promise.allSettled([
              api.get(`/policies/${p.id}`),
              api.get(`/payments/pending`, { params: { policy_id: p.id } }),
              api.get(`/policies/${p.id}/receipts`),
            ]);

            if (detRes.status === "fulfilled") detail = detRes.value.data || null;
            if (pendRes.status === "fulfilled") {
              pending = (pendRes.value.data || []).slice(0, 1);
            } else {
              pendingError =
                pendRes.reason?.response?.data?.detail ||
                "No se pudo consultar pagos pendientes para esta póliza.";
              const detailMsg = pendRes.reason?.response?.data?.detail || "";
              if (detailMsg.includes("start_date")) {
                pendingHint = "Falta fecha de inicio. Escribinos para completarla.";
              } else if (detailMsg.includes("premium")) {
                pendingHint = "Falta cargar el monto mensual. Contactá soporte para actualizarlo.";
              }
            }
            if (recRes.status === "fulfilled") receipts = recRes.value.data || [];

            return {
              policy: p,
              detail,
              pending,
              pendingError,
              pendingHint,
              receipts,
            };
          })
        );

        setRows(packs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const targetId =
      Number(location.state?.policyId) ||
      Number(searchParams.get("policy")) ||
      null;
    if (!targetId || !rows.length) return;
    const el = policyRefs.current[targetId];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("highlighted-policy");
      setTimeout(() => el.classList.remove("highlighted-policy"), 1800);
    }
  }, [location.state?.policyId, searchParams, rows]);

  const hasSelection = selected.size > 0;

  const totalToPay = useMemo(() => {
    let total = 0;
    rows.forEach(({ pending }) => {
      const ch = pending[0];
      if (ch && selected.has(ch.id)) total += Number(ch.amount || 0);
    });
    return total;
  }, [rows, selected]);

  const toggleCharge = (chargeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(chargeId) ? next.delete(chargeId) : next.add(chargeId);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set();
    rows.forEach(({ pending }) => {
      if (pending?.[0]) allIds.add(pending[0].id);
    });
    setSelected(allIds);
  };

  const deselectAll = () => setSelected(new Set());

  const periodFromCharge = (ch) => {
    const raw = ch?.due_date;
    const d = raw ? new Date(`${raw}T00:00:00`) : new Date();
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}${m}`;
  };

  const paySelected = async () => {
    if (!hasSelection) return;
    const selections = [];
    rows.forEach(({ policy, pending }) => {
      const ch = pending[0];
      if (ch && selected.has(ch.id)) {
        selections.push({
          policyId: policy.id,
          chargeId: ch.id,
          period: periodFromCharge(ch),
        });
      }
    });
    if (!selections.length) return;
    try {
      setPaying(true);
      for (const sel of selections) {
        const { initPoint } = await createPreference(
          sel.policyId,
          sel.period,
          sel.chargeId ? [sel.chargeId] : []
        );
        if (initPoint) window.open(initPoint, "_blank", "noopener,noreferrer");
      }
      await Promise.all(
        rows.map(async (row) => {
          const pendRes = await api.get(`/payments/pending`, {
            params: { policy_id: row.policy.id },
          });
          return { ...row, pending: (pendRes.data || []).slice(0, 1) };
        })
      ).then((refreshed) => setRows(refreshed));
      setSelected(new Set());
    } catch (e) {
      alert(e?.response?.data?.detail || e?.message || "No se pudo iniciar el pago.");
    } finally {
      setPaying(false);
    }
  };

  const content = loading ? (
    <p className="muted">Cargando…</p>
  ) : (
    <>
      <header className="pay-header user-page__header">
        <h1 className="pay-title user-page__title">Pagos pendientes</h1>

        <div className="pay-cta">
          {/* Botones secundarios */}
          <div className="btn-group">
            <button className="btn--secondary" onClick={selectAll}>
              Seleccionar todo
            </button>
            <button className="btn--secondary" onClick={deselectAll}>
              Deseleccionar todo
            </button>
          </div>

          {/* Total y botón principal */}
          <div className="pay-total">
            Total:&nbsp;
            <strong>
              $
              {totalToPay.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>

          <button
            className="btn--primary"
            onClick={paySelected}
            disabled={!hasSelection || paying}
          >
            {paying ? "Creando pago…" : "Pagar seleccionados"}
          </button>
        </div>
      </header>

      <section className="pay-list">
        {rows.map(({ policy, detail, pending, pendingError, pendingHint, receipts }) => {
          const ch = pending[0];
          const selectedThis = ch ? selected.has(ch.id) : false;
          const visibleEndDate = policy.client_end_date || policy.end_date;

          return (
            <article
              className="pay-item user-card"
              key={policy.id}
              ref={(el) => {
                if (el) policyRefs.current[policy.id] = el;
              }}
            >
              <div className="pay-item__head">
                <div className="pay-item__title">
                  <h2>
                    {policy.product} — {policy.plate}
                  </h2>
                  <p className="muted">
                    Póliza #{policy.number} &nbsp;•&nbsp;
                    <strong>{statusLabel(policy.status)}</strong>
                  </p>
                </div>
                <div className="pay-item__meta">
                  <div className="meta-col">
                    <span className="meta-label">Inicio</span>
                    <strong>{policy.start_date}</strong>
                  </div>
                  <div className="meta-col">
                    <span className="meta-label">Vencimiento</span>
                    <strong>{visibleEndDate}</strong>
                  </div>
                  <div className="meta-col">
                    <span className="meta-label">Pago habilitado</span>
                    <strong>{paymentWindow(policy)}</strong>
                  </div>
                </div>
              </div>

              <div className="pay-charge">
                {ch ? (
                  <label className="charge-row">
                    <input
                      type="checkbox"
                      checked={selectedThis}
                      onChange={() => toggleCharge(ch.id)}
                    />
                    <div className="charge-info">
                      <div className="charge-concept">{ch.concept}</div>
                      <div className="charge-meta">
                        <span className="charge-amount">
                          ${Number(ch.amount).toLocaleString("es-AR")}
                        </span>
                        {ch.due_date && (
                          <span className="charge-due">
                            Vence: {ch.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ) : (
                  <div className="muted">
                    <p>{pendingError || "No hay pagos pendientes para esta póliza."}</p>
                    {pendingHint && <p className="small">{pendingHint}</p>}
                    <p className="small">
                      ¿Necesitás ayuda?{" "}
                      <a href="mailto:hola@sancayetano.com">Contactá soporte</a>.
                    </p>
                  </div>
                )}
              </div>

              {/* Comprobantes */}
              <details className="po-receipts">
                <summary>Ver comprobantes</summary>
                {receipts.length ? (
                  <ul className="rec-list">
                    {receipts.map((r) => (
                      <li key={r.id} className="rec-item">
                        <div className="rec-head">
                          <details className="rec-collapse">
                            <summary className="rec-date">
                              {formatDate(r.date)}
                            </summary>
                            <div className="rec-ticket">
                              <ReceiptTicket
                                receipt={r}
                                policy={policy}
                                detail={detail}
                              />
                            </div>
                          </details>

                          {r.file_url ? (
                            <a
                              className="btn btn--outline btn--sm pay-download-btn"
                              href={r.file_url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Descargar comprobante"
                              download
                            >
                              <span
                                className="po-download-icon"
                                aria-hidden="true"
                              >
                                <svg viewBox="0 0 24 24" role="presentation">
                                  <path
                                    d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </a>
                          ) : (
                            <span className="muted small">PDF no disponible</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No hay comprobantes.</p>
                )}
              </details>
            </article>
          );
        })}
      </section>
    </>
  );

  return (
    <section className="payments policies-page user-page">
      {content}
    </section>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d)) return iso;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
