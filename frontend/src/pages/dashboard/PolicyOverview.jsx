import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { createPreference } from "@/services/payments";
import "@/pages/dashboard/dashboard.css";
import ReceiptTicket from "@/components/receipts/ReceiptTicket";
import "@/components/receipts/ReceiptTicket.css";

function addMonths(date, n) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() < day) d.setDate(0);
  return d;
}
function getNextAdjustmentLabel(startISO) {
  if (!startISO) return null;
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let next = new Date(start);
  while (next <= now) next = addMonths(next, 3);
  return next.toLocaleString("es-AR", { month: "long", year: "numeric" });
}

function paymentWindowLabel(policy) {
  if (!policy) return "—";
  const start = policy.payment_start_date;
  const end = policy.payment_end_date || policy.client_end_date || policy.end_date;
  if (start && end) return `${start} → ${end}`;
  if (start) return start;
  return end || "—";
}

export default function PolicyOverview() {
  const [policies, setPolicies] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const [pending, setPending] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [paying, setPaying] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    window.matchMedia("(min-width: 901px)").matches
  );

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/policies/my");
        setPolicies(data || []);
        setSelected((data && data[0]) || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected?.id) return;
    (async () => {
      try {
        const [{ data: det }, pend, recs] = await Promise.all([
          api.get(`/policies/${selected.id}`),
          api.get(`/payments/pending`, {
            params: { policy_id: selected.id },
          }),
          api.get(`/policies/${selected.id}/receipts`),
        ]);
        setDetail(det || null);
        setPending((pend.data || []).slice(0, 1));
        setReceipts(recs.data || []);
      } catch {
        setDetail(null);
        setPending([]);
        setReceipts([]);
      }
    })();
  }, [selected?.id]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const handler = (e) => setIsDesktop(e.matches);
    handler(mq);
    mq.addEventListener
      ? mq.addEventListener("change", handler)
      : mq.addListener(handler);
    return () => {
      mq.removeEventListener
        ? mq.removeEventListener("change", handler)
        : mq.removeListener(handler);
    };
  }, []);

  const hasPolicies = policies.length > 0;
  const current = hasPolicies ? selected || policies[0] : null;
  const nextAdjLabel = useMemo(
    () => getNextAdjustmentLabel(current?.start_date),
    [current?.start_date]
  );

  const statusLabel = (status) =>
    ({
      active: "Activa",
      no_coverage: "Sin cobertura",
      expired: "Vencida",
      suspended: "Suspendida",
      cancelled: "Cancelada",
      inactive: "Inactiva",
    }[status] || "—");

  const statusClass = (status) => {
    if (status === "active") return "is-active";
    if (status === "no_coverage") return "is-warning";
    return "is-inactive";
  };

  const periodFromCharge = (ch) => {
    const raw = ch?.due_date;
    const d = raw ? new Date(`${raw}T00:00:00`) : new Date();
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}${m}`;
  };

  async function payCurrentCharge() {
    if (!current) return;
    const ch = pending[0];
    if (!ch) return;
    try {
      setPaying(true);
      const { initPoint } = await createPreference(
        current.id,
        periodFromCharge(ch),
        ch?.id ? [ch.id] : []
      );
      if (initPoint) window.open(initPoint, "_blank", "noopener,noreferrer");

      const [pend, recs] = await Promise.all([
        api.get(`/payments/pending`, { params: { policy_id: current.id } }),
        api.get(`/policies/${current.id}/receipts`),
      ]);
      setPending((pend.data || []).slice(0, 1));
      setReceipts(recs.data || []);
    } catch (e) {
      alert(e?.response?.data?.detail || e?.message || "No se pudo iniciar el pago.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <section className="policy-overview policies-page user-page">
        <p className="muted">Cargando…</p>
      </section>
    );
  }

  return (
    <section className="policy-overview policies-page user-page">
      {/* Header */}
      <header className="po-header user-page__header">
        <h1 className="po-title user-page__title">Mis pólizas</h1>
        {hasPolicies && policies.length > 1 && (
          <div className="po-picker">
            <button
              type="button"
              className="po-picker__btn"
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((v) => !v)}
            >
              <span>
                {current?.plate} — {current?.product}
              </span>
              <span aria-hidden="true">▾</span>
            </button>
            {pickerOpen && (
              <ul className="po-picker__list" role="listbox">
                {policies.map((p) => (
                  <li
                    key={p.id}
                    role="option"
                    aria-selected={p.id === current?.id}
                    className={`po-picker__item ${
                      p.id === current?.id ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      setSelected(p);
                      setPickerOpen(false);
                    }}
                  >
                    {p.plate} — {p.product}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>

      {!hasPolicies ? (
        <section className="po-card po-empty user-card po-empty-state">
          <div className="po-empty__icon" aria-hidden>
            📄
          </div>
          <div className="po-empty__content">
            <h2 className="po-empty__title">
              Aún no tenés pólizas asociadas
            </h2>
            <p className="po-empty__text">
              Vinculá tu póliza para ver su resumen, pagos y comprobantes en
              este panel.
            </p>
            <Link
              to="/dashboard/asociar-poliza"
              className="btn btn--primary po-empty__btn"
            >
              Asociar póliza
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Encabezado póliza */}
          <section className="po-card po-hero user-card">
            <div className="po-hero__head">
              <h2 className="po-plan">{current.product}</h2>
              <span className={`po-status ${statusClass(current.status)}`}>
                {statusLabel(current.status)}
              </span>
            </div>
            <p className="po-hero__sub muted">
              Póliza #{current.number} — {current.plate}
            </p>
          </section>

          {/* Resumen */}
          <section className="po-card po-summary user-card">
            {nextAdjLabel && (
              <div className="po-adj">
                <strong className="po-adj__date">{nextAdjLabel}</strong>
                <span className="po-chip">Próximo ajuste</span>
              </div>
            )}
            <div
              className="po-summaryGrid"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 8 }}
            >
              <div className="po-summaryItem">
                <span className="muted">Vencimiento visible</span>
                <strong>{detail?.client_end_date || detail?.end_date || current?.client_end_date || current?.end_date || "—"}</strong>
              </div>
              <div className="po-summaryItem">
                <span className="muted">Ventana de pago</span>
                <strong>{paymentWindowLabel(detail || current)}</strong>
              </div>
              <div className="po-summaryItem">
                <span className="muted">Ajuste de precio</span>
                <strong>
                  {(detail || current)?.price_update_from || (detail || current)?.price_update_to
                    ? [(detail || current)?.price_update_from, (detail || current)?.price_update_to].filter(Boolean).join(" → ")
                    : "—"}
                </strong>
              </div>
            </div>
          </section>

          {/* Datos de la póliza / vehículo */}
          {detail && (
            <section className="po-card po-details user-card">
              <h3 className="po-sectionTitle">Datos de la póliza</h3>
              <div className="po-detailsGrid">
                <div>
                  <dt>Marca</dt>
                  <dd>{detail.vehicle?.make || "—"}</dd>
                </div>
                <div>
                  <dt>Modelo</dt>
                  <dd>{detail.vehicle?.model || "—"}</dd>
                </div>
                <div>
                  <dt>Versión</dt>
                  <dd>{detail.vehicle?.version || "—"}</dd>
                </div>
                <div>
                  <dt>Año</dt>
                  <dd>{detail.vehicle?.year || "—"}</dd>
                </div>

                <div>
                  <dt>Localidad</dt>
                  <dd>{detail.city || "—"}</dd>
                </div>
                <div>
                  <dt>Garage</dt>
                  <dd>{detail.has_garage ? "Sí" : "No"}</dd>
                </div>
                <div>
                  <dt>0 km</dt>
                  <dd>{detail.is_zero_km ? "Sí" : "No"}</dd>
                </div>
                <div>
                  <dt>Uso</dt>
                  <dd>
                    {detail.usage === "comercial" ? "Comercial" : "Privado"}
                  </dd>
                </div>

                <div className="po-colSpan2">
                  <dt>GNC</dt>
                  <dd>
                    {detail.has_gnc
                      ? `Sí${
                          detail.gnc_amount
                            ? ` (monto ${detail.gnc_amount})`
                            : ""
                        }`
                      : "No"}
                  </dd>
                </div>
              </div>
            </section>
          )}

          {/* Pagos + Comprobantes */}
          <section className="po-card po-payInline user-card">
            <div className="po-card__head">
              <h3 className="po-sectionTitle">Pagos</h3>
              <span className="po-pill">Coberturas y recibos</span>
            </div>
            <div className="po-inlineContent">
              {pending.length ? (
                <div className="po-inlineRow">
                  <div className="po-inlineInfo">
                    <div className="po-charge__concept">
                      {pending[0].concept}
                    </div>
                    <div className="po-charge__meta">
                      <span className="po-charge__amount">
                        ${Number(pending[0].amount).toLocaleString()}
                      </span>
                      {pending[0].due_date && (
                        <span className="po-charge__due">
                          Vence: {pending[0].due_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={payCurrentCharge}
                    disabled={paying}
                  >
                    {paying ? "Creando pago..." : "Pagar"}
                  </button>
                </div>
              ) : (
                <p className="muted">
                  No hay pagos pendientes para esta póliza.
                </p>
              )}

              {/* Comprobantes */}
              <div className="po-receipts">
                <div className="po-recHeader">Comprobantes</div>
                {receipts.length ? (
                  isDesktop ? (
                    <ul className="po-recList">
                      {receipts.map((r) => (
                        <li key={r.id} className="po-receipt">
                          <details>
                            <summary className="po-receipt__summary">
                              <span className="po-receipt__date">
                                {r.date}
                              </span>
                              <div className="po-receipt__right">
                                {typeof r.amount !== "undefined" && (
                                  <span className="po-receipt__amount">
                                    ${Number(r.amount).toLocaleString()}
                                  </span>
                                )}
                                {r.file_url ? (
                                  <a
                                    className="btn btn--outline btn--xs po-receipt__btn"
                                    href={r.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    aria-label="Descargar comprobante"
                                  >
                                    <span
                                      className="po-download-icon"
                                      aria-hidden="true"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        role="presentation"
                                      >
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
                            </summary>
                            <div className="po-receipt__body">
                              <ReceiptTicket
                                receipt={r}
                                policy={{
                                  number: current?.number,
                                  product: current?.product,
                                  plate: current?.plate,
                                }}
                                detail={detail}
                              />
                            </div>
                          </details>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="po-recListWrap">
                      <ul className="po-recList">
                        {receipts.slice(0, 5).map((r) => (
                          <li key={r.id} className="po-receipt">
                            <div className="po-receipt__summary">
                              <span className="po-receipt__date">
                                {r.date}
                              </span>
                              <div className="po-receipt__right">
                                {typeof r.amount !== "undefined" && (
                                  <span className="po-receipt__amount">
                                    ${Number(r.amount).toLocaleString()}
                                  </span>
                                )}
                                {r.file_url ? (
                                  <a
                                    className="btn btn--outline btn--xs po-receipt__btn"
                                    href={r.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    aria-label="Descargar comprobante"
                                  >
                                    <span
                                      className="po-download-icon"
                                      aria-hidden="true"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        role="presentation"
                                      >
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
                            </div>
                          </li>
                        ))}
                      </ul>
                      {receipts.length > 5 ? (
                        <div className="po-receipt__more">
                          <Link
                            className="btn btn--outline btn--sm"
                            to="/dashboard/pagos"
                            state={{ policyId: current?.id }}
                          >
                            Ver más comprobantes
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  )
                ) : (
                  <p className="muted">No hay comprobantes.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
