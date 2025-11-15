import { NavLink, Outlet } from "react-router-dom";
import "./dashboard.css";

export default function UserDashboardLayout() {
  return (
    <section className="section container">
      <nav className="ud-nav">
        <NavLink to="/dashboard/seguro">Mi seguro</NavLink>
        <NavLink to="/dashboard/pagos">Pagos y comprobantes</NavLink>
        <NavLink to="/dashboard/asociar-poliza">Asociar póliza</NavLink>
        <NavLink to="/dashboard/perfil">Perfil</NavLink>
      </nav>

      <div className="ud-content">
        <Outlet />
      </div>
    </section>
  );
}
