export default function Policies({ policies }) {
  return (
    <section className="policies-section">
      <h2>Mis pólizas</h2>
      {policies.length === 0 ? (
        <p>No tenés pólizas registradas aún.</p>
      ) : (
        <div className="policies-grid">
          {policies.map((p) => (
            <div key={p.id} className={`policy-card status-${p.status.toLowerCase()}`}>
              <h3>{p.vehicle?.model_name || "Vehículo asegurado"}</h3>
              <p><strong>N°:</strong> {p.number || "—"}</p>
              <p><strong>Plan:</strong> {p.product?.name}</p>
              <p><strong>Estado:</strong> {p.status}</p>
              <p><strong>Vigencia:</strong> {p.start_date} → {p.end_date}</p>
              <p><strong>Prima:</strong> ${p.premium}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
