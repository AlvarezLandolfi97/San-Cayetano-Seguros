import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import ReceiptTicket from "@/components/receipts/ReceiptTicket";
import "@/styles/Payments.css";

export default function Payments() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: policies } = await api.get("/policies/my");

        const packs = await Promise.all(
          (policies || []).map(async (p) => {
            const [detRes, pendRes, recRes] = await Promise.all([
              api.get(`/policies/${p.id}`),
              api.get(`/payments/pending`, { params: { policy_id: p.id } }),
              api.get(`/policies/${p.id}/receipts`),
            ]);
            const pending = (pendRes.data || []).slice(0, 1);
            return {
              policy: p,
              detail: detRes.data || null,
              pending,
              receipts: recRes.data || [],
            };
          })
        );

        setRows(packs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const paySelected = async () => {
    if (!hasSelection) return;
    try {
      setPaying(true);
      const ids = Array.from(selected);
      const { data } = await api.post("/payments/mp/preference", {
        charge_ids: ids,
      });
      if (data?.init_point) window.open(data.init_point, "_blank", "noopener,noreferrer");
      setSelected(new Set());
      const refreshed = await Promise.all(
        rows.map(async (row) => {
          const pendRes = await api.get(`/payments/pending`, {
            params: { policy_id: row.policy.id },
          });
          return { ...row, pending: (pendRes.data || []).slice(0, 1) };
        })
      );
      setRows(refreshed);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <main className="payments container section">
        <p className="muted">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="payments container section">
      <header className="pay-header">
        <h1 className="pay-title">Pagos pendientes</h1>

        <div className="pay-cta">
          {/* Botones secundarios alineados horizontalmente */}
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
        {rows.map(({ policy, detail, pending, receipts }) => {
          const ch = pending[0];
          const selectedThis = ch ? selected.has(ch.id) : false;

          return (
            <article className="pay-item" key={policy.id}>
              <div className="pay-item__head">
                <div className="pay-item__title">
                  <h2>
                    {policy.product} — {policy.plate}
                  </h2>
                  <p className="muted">
                    Póliza #{policy.number} &nbsp;•&nbsp;
                    <strong>
                      {policy.status === "active" ? "Activa" : "Inactiva"}
                    </strong>
                  </p>
                </div>
                <div className="pay-item__meta">
                  <div className="meta-col">
                    <span className="meta-label">Inicio</span>
                    <strong>{policy.start_date}</strong>
                  </div>
                  <div className="meta-col">
                    <span className="meta-label">Vencimiento</span>
                    <strong>{policy.end_date}</strong>
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
                  <p className="muted">
                    No hay pagos pendientes para esta póliza.
                  </p>
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
                              className="btn btn--outline btn--sm"
                              href={r.file_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Descargar
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--outline btn--sm"
                              onClick={() => window.print()}
                            >
                              Descargar
                            </button>
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
    </main>
  );
}

/* ======== Utilidad para formatear fechas ======== */
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
