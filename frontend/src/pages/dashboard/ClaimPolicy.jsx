import { useState } from "react";
import { api } from "@/api";

export default function ClaimPolicy() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [claimed, setClaimed] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setClaimed(null);

    const trimmed = code.trim().toUpperCase();
    if (!/^[A-Z0-9\-]{6,}$/.test(trimmed)) {
      return setMsg({ type: "error", text: "Ingresá un código válido." });
    }

    try {
      setLoading(true);
      const { data } = await api.post("/policies/claim", { code: trimmed });
      setClaimed(data?.policy || null);
      setMsg({
        type: "success",
        text: "¡Póliza asociada con éxito a tu cuenta!",
      });
      setCode("");
    } catch (e) {
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
            Ingresá el código de asociación que te compartieron para vincular
            la póliza a tu cuenta.
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
            <label htmlFor="code" className="required">
              Código de asociación
            </label>
            <input
              id="code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: SC-7K3Q9F"
              autoFocus
              required
            />
            <small className="hint">
              Lo genera el administrador al crear la póliza.
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
