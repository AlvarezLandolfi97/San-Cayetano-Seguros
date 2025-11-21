import { useState } from "react";
import { createPreference } from "../../services/payments";

export default function MercadoPagoButton({ policyId, period = "202510", onStarted }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const pay = async () => {
    setLoading(true); setErr("");
    try {
      const { initPoint, paymentId } = await createPreference(policyId, period);
      onStarted?.(paymentId);
      window.location.href = initPoint; // redirección (stub MP)
    } catch (e) {
      setErr(e.message || "No se pudo iniciar el pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        className="btn btn--primary"
        onClick={pay}
        disabled={loading}
        aria-busy={loading ? "true" : "false"}
      >
        {loading ? "Abriendo pago..." : "Pagar con Mercado Pago"}
      </button>
      {err && <p role="alert" style={{ color: "red", marginTop: 8 }}>{err}</p>}
    </div>
  );
}
