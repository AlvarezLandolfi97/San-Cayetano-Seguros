// src/pages/admin/AdminLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import "./admin.css";

const NAV_ITEMS = [
  { to: "/admin/seguros", label: "Seguros", icon: "S" },
  { to: "/admin/polizas", label: "Pólizas", icon: "P" },
  { to: "/admin", label: "Inicio", icon: "A" },
  { to: "/admin/usuarios", label: "Usuarios", icon: "U" },
  { to: "/admin/contacto", label: "Contacto", icon: "C" },
];

export default function AdminLayout() {
  useEffect(() => {
    document.body.classList.add("admin-page");
    return () => document.body.classList.remove("admin-page");
  }, []);

  return (
    <section className="section container">
      <div className="admin-shell">
        {/* Contenido */}
        <div className="admin-panel">
          <header className="admin-panel__header">
            {/* Tu título/subtítulo propio de cada página suele ir en cada subpágina */}
          </header>
          <Outlet />
        </div>
      </div>
      <nav className="admin-bottom-nav" aria-label="Navegación de administrador">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `admin-bottom-nav__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="admin-bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="admin-bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </section>
  );
}
