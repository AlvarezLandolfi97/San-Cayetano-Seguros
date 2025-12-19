import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { claimPolicy } from "@/api/policies";
import useAuth from "@/hooks/useAuth";

export default function ClaimPolicy() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [policyNumber, setPolicyNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [claimed, setClaimed] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      nav("/login", { replace: true, state: { from: location.pathname } });
    }
  }, [authLoading, user, nav, location.pathname]);

  // Evita parpadeos mientras redirige al login
  if (!authLoading && !user) return null;

  async function onSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setClaimed(null);

    const trimmed = policyNumber.trim();
    if (!trimmed) {
      return setMsg({
        type: "error",
        text: "Ingresá el número de póliza que te compartieron.",
      });
    }

    try {
      setLoading(true);
      const { data } = await claimPolicy(trimmed);
      setClaimed(data?.policy || null);
      setMsg({
        type: "success",
        text: "¡Póliza asociada con éxito a tu cuenta!",
      });
      setPolicyNumber("");
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        nav("/login", { replace: true, state: { from: location.pathname } });
        return;
      }
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        "No se pudo asociar la póliza. Verificá el código e intentá nuevamente.";
      setMsg({ type: "error", text: detail });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="claim-policy policies-page user-page">
      <header className="user-page__header">
        <div>
          <h1 className="user-page__title">Asociar póliza</h1>
          <p className="user-page__subtitle">
            Ingresá el número de póliza que te compartieron para vincularla a tu
            cuenta.
          </p>
        </div>
      </header>

      <div className="claim-card user-card">
        {msg.text && (
          <div
            className={`claim-alert ${
              msg.type === "error" ? "is-error" : "is-success"
            }`}
            role="alert"
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={onSubmit} className="form claim-form" noValidate>
          <div className="field">
            <label htmlFor="policy-number" className="required">
              Número de póliza
            </label>
            <input
              id="policy-number"
              name="policy-number"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="Ej: 45132011"
              autoFocus
              required
            />
            <small className="hint">
              El número te lo comparte el dueño una vez que crea la póliza.
            </small>
          </div>

          <div className="actions">
            <button className="btn btn--primary" type="submit" disabled={loading}>
              {loading ? "Asociando..." : "Asociar póliza"}
            </button>
          </div>
        </form>
      </div>

      {claimed && (
        <div className="claim-card claim-card--result user-card">
          <h3 className="claim-title">Póliza asociada</h3>
          <p className="claim-text">
            <strong>{claimed.product?.name || "Plan"}</strong> —{" "}
            <span>#{claimed.number}</span>{" "}
            {claimed.vehicle?.plate ? `— ${claimed.vehicle.plate}` : ""}
          </p>
          <p className="claim-sub">
            Estado: {claimed.status_readable || claimed.status || "—"}
          </p>
        </div>
      )}
    </section>
  );
}
