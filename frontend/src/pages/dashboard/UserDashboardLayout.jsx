import { NavLink, Outlet } from "react-router-dom";
import "./dashboard.css";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

const IconSeguro = () => (
  <svg {...iconProps}>
    <path d="M12 3.5 6 6.5v5.5c0 3.4 2.7 6.2 6 7.5 3.3-1.3 6-4.1 6-7.5V6.5L12 3.5Z" />
    <path d="M10 12.5 12 14l3-3.5" />
  </svg>
);

const IconPagos = () => (
  <svg {...iconProps}>
    <path d="M7 18V5h5a3.5 3.5 0 0 1 0 7H7" />
    <path d="M7 12h5" />
  </svg>
);

const IconAsociar = () => (
  <svg {...iconProps}>
    <path d="M12 4v16" />
    <path d="M4 12h16" />
  </svg>
);

const IconPerfil = () => (
  <svg {...iconProps}>
    <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M5 19c1-2.6 3.5-4 7-4s6 1.4 7 4" />
  </svg>
);

const NAV_ITEMS = [
  { to: "/dashboard/seguro", label: "Mi seguro", icon: "S" },
  { to: "/dashboard/pagos", label: "Pagos", icon: "P" },
  { to: "/dashboard/asociar-poliza", label: "Asociar", icon: "A" },
  { to: "/dashboard/perfil", label: "Perfil", icon: <IconPerfil /> },
];

export default function UserDashboardLayout() {
  return (
    <section className="section container user-shell">
      <div className="user-shell__body">
        <aside className="user-sidebar" aria-label="Navegación de usuario">
          <div className="user-sidebar__items">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={`user-${item.to}`}
                to={item.to}
                end={item.to === "/dashboard/seguro"}
                className={({ isActive }) =>
                  `user-sidebar__item ${isActive ? "is-active" : ""}`
                }
              >
                <span className="user-sidebar__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="user-sidebar__label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </aside>

        <div className="user-panel">
          <Outlet />
        </div>
      </div>

      <nav className="user-bottom-nav" aria-label="Navegación de usuario">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={`bottom-${item.to}`}
            to={item.to}
            end={item.to === "/dashboard/seguro"}
            className={({ isActive }) =>
              `user-bottom-nav__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="user-bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="user-bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </section>
  );
}
