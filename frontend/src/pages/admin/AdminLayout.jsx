// src/pages/admin/AdminLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import "./admin.css";

const NAV_ITEMS = [
  { to: "/admin/seguros", label: "Seguros", icon: "S" },
  { to: "/admin/polizas", label: "Pólizas", icon: "P" },
  { to: "/admin", label: "Admin", icon: "A" },
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
        <aside className="admin-sidebar" aria-label="Navegación de administrador">
          <div className="admin-sidebar__items">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={`side-${item.to}`}
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }) =>
                  `admin-sidebar__item ${isActive ? "is-active" : ""}`
                }
              >
                <span className="admin-sidebar__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="admin-sidebar__label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </aside>
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
            end={item.to === "/admin"}
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
