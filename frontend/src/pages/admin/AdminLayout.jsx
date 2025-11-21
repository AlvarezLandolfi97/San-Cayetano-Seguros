// src/pages/admin/AdminLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import "./admin.css";

const linkClass = ({ isActive }) =>
  `admin-nav__item ${isActive ? "is-active" : ""}`;

export default function AdminLayout() {
  return (
    <section className="section container">
      <div className="admin-shell">
        {/* Sidebar */}
        <aside className="admin-sidebar" aria-label="Menú administrador">
          <div className="admin-sidebar__title">Admin</div>
          <nav className="admin-nav">
            <NavLink to="/admin/seguros" className={linkClass}>
              Tipos de seguro
            </NavLink>
            <NavLink to="/admin/polizas" className={linkClass}>
              Pólizas
            </NavLink>
            <NavLink to="/admin/usuarios" className={linkClass}>
              Usuarios
            </NavLink>
          </nav>
        </aside>

        {/* Contenido */}
        <div className="admin-panel">
          <header className="admin-panel__header">
            {/* Tu título/subtítulo propio de cada página suele ir en cada subpágina */}
          </header>
          <Outlet />
        </div>
      </div>
    </section>
  );
}
