// src/components/ui/Navbar.jsx
import { useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import "./navbar.css";

// Normaliza distintas formas de marcar admin
function isAdminUser(u) {
  if (!u) return false;
  const flag = u.is_admin ?? u.isAdmin ?? u.is_staff ?? u.admin ?? u.role;
  if (typeof flag === "string") {
    const s = flag.toLowerCase();
    if (s === "admin") return true;
    if (["true", "1", "yes", "si"].includes(s)) return true;
  }
  if (typeof flag === "number") return flag === 1;
  if (typeof flag === "boolean") return flag === true;
  return u.role === "admin";
}

/**
 * Navbar accesible:
 * - <header> y <nav> semánticos
 * - "Skip to content" link
 * - Menú móvil con aria-expanded y aria-controls
 * - Cierra con ESC, clic fuera o al navegar
 */
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const { user, logout } = useAuth();

  const isLoggedIn = !!user;
  const isAdmin = isAdminUser(user);

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const onClick = (e) => {
      if (!open) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  // Clase activa de NavLink
  const active = ({ isActive }) =>
    isActive ? "nav__link is-active" : "nav__link";

  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>

      <div className="nav container">
        {/* Logo */}
        <div className="nav__brand">
          <Link to="/" className="nav__logo" aria-label="Ir al inicio">
            <img
              src="/brand/tsblanco.png"
              alt="San Cayetano Seguros"
              className="nav__brand-img"
            />
          </Link>
        </div>

        {/* Botón hamburguesa */}
        <button
          ref={btnRef}
          className="nav__toggle btn--ghost"
          aria-controls="primary-menu"
          aria-expanded={open ? "true" : "false"}
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Navegación principal */}
        <nav className="nav__menu" aria-label="Principal">
          <ul
            id="primary-menu"
            ref={menuRef}
            className={`nav__list ${open ? "is-open" : ""}`}
            onClick={(e) => {
              if (e.target.tagName === "A") setOpen(false);
            }}
          >
            {/* Siempre visible: Inicio */}
            <li>
              <NavLink to="/" className={active} end>
                Inicio
              </NavLink>
            </li>

            {/* Vista ADMIN: solo Admin + Cerrar sesión */}
            {isLoggedIn && isAdmin ? (
              <>
                <li>
                  <NavLink to="/admin" className={active}>
                    Admin
                  </NavLink>
                </li>
                <li>
                  <button onClick={logout} className="btn btn--secondary">
                    Cerrar sesión
                  </button>
                </li>
              </>
            ) : (
              // Vista NO ADMIN
              <>
                <li>
                  <NavLink to="/quote" className={active}>
                    Cotizar
                  </NavLink>
                </li>

                {isLoggedIn ? (
                  <>
                    <li>
                      <NavLink to="/claim-policy" className={active}>
                        Asociar póliza
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/dashboard/seguro" className={active}>
                        Mi cuenta
                      </NavLink>
                    </li>
                    <li>
                      <button onClick={logout} className="btn btn--secondary">
                        Cerrar sesión
                      </button>
                    </li>
                  </>
                ) : (
                  <li className="nav__cta">
                    <NavLink to="/login" className="btn btn--secondary">
                      Ingresar
                    </NavLink>
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
