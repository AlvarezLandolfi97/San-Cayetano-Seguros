import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import InsuranceSelector from "./InsuranceSelector";
import "./Dashboard.css";

export default function DashboardLayout() {
  const [policies, setPolicies] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("/api/policies?mine=1")
      .then(res => res.json())
      .then(data => {
        setPolicies(data);
        setSelected(data[0]?.id);
      });
  }, []);

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>Panel</h2>
        <nav>
          <a href="/dashboard">Mis seguros</a>
          <a href="/dashboard/payments">Pagos</a>
          <a href="/dashboard/profile">Mi perfil</a>
        </nav>
      </aside>

      <main className="dashboard__main">
        <Outlet context={{ selectedPolicyId: selected }} />
      </main>
    </div>
  );
}
