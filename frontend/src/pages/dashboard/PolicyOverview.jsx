import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import "@/styles/PolicyOverview.css";
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

export default function PolicyOverview() {
  const [policies, setPolicies] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const [pending, setPending] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [paying, setPaying] = useState(false);

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
          api.get(`/payments/pending`, { params: { policy_id: selected.id } }),
          api.get(`/policies/${selected.id}/receipts`),
        ]);
        setDetail(det || null);
        setPending((pend.data || []).slice(0, 1));
        setReceipts(recs.data || []); // cada item: {id, date, amount, concept, method, auth_code, file_url}
      } catch {
        setDetail(null);
        setPending([]);
        setReceipts([]);
      }
    })();
  }, [selected?.id]);

  const current = selected || policies[0];
  const nextAdjLabel = useMemo(
    () => getNextAdjustmentLabel(current?.start_date),
    [current?.start_date]
  );

async function payCurrentCharge() {
  const ch = pending[0];
  if (!ch) return;
  try {
    setPaying(true);
    const { data } = await api.post("/payments/mp/preference", {
      charge_ids: [ch.id],
    });
    // Abrimos MP en otra pestaña (mock)
    if (data?.init_point)
      window.open(data.init_point, "_blank", "noopener,noreferrer");

    // 🔁 Re-cargar pendientes y recibos para ver el recibo recién creado
    const [pend, recs] = await Promise.all([
      api.get(`/payments/pending`, { params: { policy_id: current.id } }),
      api.get(`/policies/${current.id}/receipts`),
    ]);
    setPending((pend.data || []).slice(0, 1));
    setReceipts(recs.data || []);
  } finally {
    setPaying(false);
  }
}


  if (loading) {
    return (
      <section className="policy-overview">
        <div className="container"><p className="muted">Cargando…</p></div>
      </section>
    );
  }

  if (!policies.length) {
    return (
      <section className="policy-overview">
        <div className="container"><h2>Sin pólizas aún</h2></div>
      </section>
    );
  }

  return (
    <section className="policy-overview">
      <div className="container">
        {/* Header */}
        <header className="po-header">
          <h1 className="po-title">Mis pólizas</h1>
          {policies.length > 1 && (
            <select
              value={current?.id || ""}
              onChange={(e) =>
                setSelected(policies.find((p) => String(p.id) === e.target.value))
              }
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.plate} — {p.product}
                </option>
              ))}
            </select>
          )}
        </header>

        {/* Encabezado póliza */}
        <section className="po-hero">
          <div className="po-hero__head">
            <h2 className="po-plan">{current.product}</h2>
            <span className={`po-status ${current.status === "active" ? "is-active" : "is-inactive"}`}>
              {current.status === "active" ? "Activa" : "Inactiva"}
            </span>
          </div>
          <p className="po-hero__sub muted">
            Póliza #{current.number} — {current.plate}
          </p>
        </section>

        {/* Resumen */}
        <section className="po-summary">
          {nextAdjLabel && (
            <div className="po-adj">
              <span className="po-chip">Próximo ajuste</span>
              <strong>{nextAdjLabel}</strong>
            </div>
          )}
        </section>

        {/* Datos de la póliza / vehículo */}
        {detail && (
          <section className="po-details">
            <h3 className="po-sectionTitle">Datos de la póliza</h3>
            <div className="po-detailsGrid">
              <div><dt>Marca</dt><dd>{detail.vehicle?.make || "—"}</dd></div>
              <div><dt>Modelo</dt><dd>{detail.vehicle?.model || "—"}</dd></div>
              <div><dt>Versión</dt><dd>{detail.vehicle?.version || "—"}</dd></div>
              <div><dt>Año</dt><dd>{detail.vehicle?.year || "—"}</dd></div>

              <div><dt>Localidad</dt><dd>{detail.city || "—"}</dd></div>
              <div><dt>Garage</dt><dd>{detail.has_garage ? "Sí" : "No"}</dd></div>
              <div><dt>0 km</dt><dd>{detail.is_zero_km ? "Sí" : "No"}</dd></div>
              <div><dt>Uso</dt><dd>{detail.usage === "comercial" ? "Comercial" : "Privado"}</dd></div>

              <div className="po-colSpan2">
                <dt>GNC</dt>
                <dd>
                  {detail.has_gnc
                    ? `Sí${detail.gnc_amount ? ` (monto ${detail.gnc_amount})` : ""}`
                    : "No"}
                </dd>
              </div>
            </div>
          </section>
        )}

        {/* Pagos + Comprobantes */}
        <section className="po-payInline">
          <h3 className="po-sectionTitle">Pagos</h3>
          <div className="po-inlineContent">
            {pending.length ? (
              <div className="po-inlineRow">
                <div className="po-inlineInfo">
                  <div className="po-charge__concept">{pending[0].concept}</div>
                  <div className="po-charge__meta">
                    <span className="po-charge__amount">
                      ${Number(pending[0].amount).toLocaleString()}
                    </span>
                    {pending[0].due_date && (
                      <span className="po-charge__due">Vence: {pending[0].due_date}</span>
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
              <p className="muted">No hay pagos pendientes para esta póliza.</p>
            )}

            {/* Comprobantes — acordeón por ítem, con botón Descargar */}
            <div className="po-receipts">
            <div className="po-recHeader">Comprobantes</div>
            {receipts.length ? (
              <ul className="po-recList">
                {receipts.map((r) => (
                  <li key={r.id} className="po-receipt">
                    <details>
                      <summary className="po-receipt__summary">
                        <span className="po-receipt__date">{r.date}</span>
                        <div className="po-receipt__right">
                          {typeof r.amount !== "undefined" && (
                            <span className="po-receipt__amount">
                              ${Number(r.amount).toLocaleString()}
                            </span>
                          )}
                          {/* Botón descargar archivo si tu API lo trae */}
                          {r.file_url ? (
                            <a
                              className="btn btn--outline btn--xs po-receipt__dl"
                              href={r.file_url}
                              target="_blank"
                              rel="noreferrer"
                              download
                            >
                              Descargar
                            </a>
                          ) : (
                            // Alternativa: imprimir HTML del ticket
                            <button
                              type="button"
                              className="btn btn--outline btn--xs po-receipt__dl"
                              onClick={() => window.print()}
                            >
                              Descargar
                            </button>
                          )}
                        </div>
                      </summary>

                      {/* Cuerpo del acordeón: Ticket con el formato pedido */}
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
              <p className="muted">No hay comprobantes.</p>
            )}
          </div>
          </div>
        </section>
      </div>
    </section>
  );
}
