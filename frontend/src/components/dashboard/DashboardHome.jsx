import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Dashboard.css";

export default function DashboardHome() {
  // viene desde DashboardLayout via <Outlet context={{ selectedPolicyId }}>
  const { selectedPolicyId } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedPolicyId) {
      setPolicy(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    // Ajustá al endpoint real de tu backend
    fetch(`/api/policies/${selectedPolicyId}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar la póliza");
        return r.json();
      })
      .then((data) => setPolicy(data))
      .catch(() => {
        // fallback mock para pruebas visuales
        setPolicy({
          id: Number(selectedPolicyId),
          product_name: "Terceros Completo",
          state: "ACT",
          valid_from: "2025-01-01",
          valid_to: "2026-01-01",
          vehicle: { brand: "Fiat", model: "Siena", plate: "AA123BB" },
        });
      })
      .finally(() => setLoading(false));
  }, [selectedPolicyId]);

  if (loading) {
    return (
      <section className="dash-card">
        <h2 className="dash-title">Mis seguros</h2>
        <p>Cargando póliza…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dash-card">
        <h2 className="dash-title">Mis seguros</h2>
        <p className="text-error">{error}</p>
      </section>
    );
  }

  if (!policy) {
    return (
      <section className="dash-card">
        <h2 className="dash-title">Mis seguros</h2>
        <p>No hay póliza seleccionada.</p>
      </section>
    );
  }

  return (
    <section className="dash-card">
      <h2 className="dash-title">Detalle de póliza</h2>
      <div className="policy-grid">
        <div>
          <div className="label">Cobertura</div>
          <div className="value">{policy.product_name}</div>
        </div>
        <div>
          <div className="label">Estado</div>
          <div className="value">{policy.state === "ACT" ? "Activa" : policy.state}</div>
        </div>
        <div>
          <div className="label">Vigencia</div>
          <div className="value">
            {policy.valid_from} → {policy.valid_to}
          </div>
        </div>
        <div>
          <div className="label">Vehículo</div>
          <div className="value">
            {policy.vehicle?.brand} {policy.vehicle?.model} · {policy.vehicle?.plate}
          </div>
        </div>
      </div>
    </section>
  );
}
