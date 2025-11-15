import { useState } from "react";
import { api } from "@/api";

export default function ClaimPolicy() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [claimed, setClaimed] = useState(null); // datos de la póliza asociada

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
      // Endpoint: POST /policies/claim { code }
      const { data } = await api.post("/policies/claim", { code: trimmed });
      setClaimed(data?.policy || null);
      setMsg({ type: "success", text: "¡Póliza asociada con éxito a tu cuenta!" });
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
    <section className="section container">
      <h1>Asociar póliza</h1>
      <p>Ingresá el <strong>código de asociación</strong> que te compartieron para vincular la póliza a tu cuenta.</p>

      {msg.text && (
        <div
          className="register-alert"
          role="alert"
          style={{
            marginTop: 12,
            color: msg.type === "error" ? "#b00020" : "#065f46",
            background: msg.type === "error" ? "#fef2f2" : "#ecfdf5",
            border: `1px solid ${msg.type === "error" ? "#fecaca" : "#a7f3d0"}`,
            padding: "10px 12px",
            borderRadius: 10,
          }}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={onSubmit} className="form" style={{ maxWidth: 520 }}>
        <div className="field">
          <label htmlFor="code" className="required">Código de asociación</label>
          <input
            id="code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej: SC-7K3Q9F"
            autoFocus
            required
          />
          <small className="hint">Lo genera el administrador al crear la póliza.</small>
        </div>

        <div className="actions">
          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? "Asociando..." : "Asociar póliza"}
          </button>
        </div>
      </form>

      {claimed && (
        <div className="card-like" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Póliza asociada</h3>
          <p style={{ margin: 0 }}>
            <strong>{claimed.product?.name || "Plan"}</strong>{" "}
            — <span>#{claimed.number}</span>{" "}
            {claimed.vehicle?.plate ? `— ${claimed.vehicle.plate}` : ""}
          </p>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted, #6b7280)" }}>
            Estado: {claimed.status_readable || claimed.status || "—"}
          </p>
        </div>
      )}
    </section>
  );
}
