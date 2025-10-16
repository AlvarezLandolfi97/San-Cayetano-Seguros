import { useState } from "react";
import MercadoPagoButton from "../components/policy/MercadoPagoButton";
import PaymentStatusBadge from "../components/policy/PaymentStatusBadge";
import ReceiptList from "../components/policy/ReceiptList";

// Suponemos que recibís la policy por fetch a /api/policies/:id (app de B)
export default function PolicyDetail() {
  // ideal: policy traída por id desde B; aquí dejamos mocks mínimos
  const policyId = Number(location.pathname.split("/").pop());
  const [lastPaymentId, setLastPaymentId] = useState(null);
  const [statusKnown, setStatusKnown] = useState(false); // como no podemos leer pagos siendo owner, lo dejamos falso

  return (
    <main id="main" className="container section">
      <h1>Detalle de póliza #{policyId}</h1>

      <section style={{ display:"grid", gap:12, marginTop: 16 }}>
        <h3>Pago</h3>

        {/* Estado (si no podemos leer el pago por permisos, mostramos "pendiente") */}
        <PaymentStatusBadge state={statusKnown ? "PEN" : "UNK"} />

        <MercadoPagoButton
          policyId={policyId}
          period="202510"
          onStarted={(paymentId) => setLastPaymentId(paymentId)}
        />

        {/* Comprobantes (sólo si el endpoint GET /payments?policy=... existe) */}
        <ReceiptList policyId={policyId} />

        {lastPaymentId && (
          <p className="text-muted" style={{ marginTop: 8 }}>
            Iniciaste el pago (ID {lastPaymentId}). Apenas el proveedor notifique por webhook, se activará la póliza y
            verás el comprobante. Podés actualizar esta página en unos minutos.
          </p>
        )}
      </section>
    </main>
  );
}
