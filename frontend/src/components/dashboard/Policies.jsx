export default function Policies({ policies }) {
  const statusLabel = (status) => ({
    active: "Activa",
    no_coverage: "Sin cobertura",
    expired: "Vencida",
    suspended: "Suspendida",
    cancelled: "Cancelada",
    inactive: "Inactiva",
  }[status] || status || "—");

  const paymentWindow = (p) => {
    const start = p.payment_start_date;
    const end = p.payment_end_date || p.client_end_date || p.end_date;
    if (start && end) return `${start} → ${end}`;
    if (start) return start;
    return end || "—";
  };

  return (
    <section className="policies-section">
      <h2>Mis pólizas</h2>
      {policies.length === 0 ? (
        <p>No tenés pólizas registradas aún.</p>
      ) : (
        <div className="policies-grid">
          {policies.map((p) => (
            <div key={p.id} className={`policy-card status-${(p.status || "default").toLowerCase()}`}>
              <h3>{p.vehicle?.model_name || "Vehículo asegurado"}</h3>
              <p><strong>N°:</strong> {p.number || "—"}</p>
              <p><strong>Plan:</strong> {p.product?.name}</p>
              <p><strong>Estado:</strong> {statusLabel(p.status)}</p>
              <p><strong>Vigencia:</strong> {p.start_date} → {p.client_end_date || p.end_date}</p>
              <p><strong>Prima:</strong> ${p.premium}</p>
              <p><strong>Periodo de pago:</strong> {paymentWindow(p)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
