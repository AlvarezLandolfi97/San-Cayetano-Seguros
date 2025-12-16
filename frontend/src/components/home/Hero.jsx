import { Link } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import "@/styles/Hero.css";

export default function Hero({
  title = "Seguros vehiculares",
  subtitle = "Cotizá tu vehículo. Activamos tu cuenta. Pagá online. ",
  primaryText = "Cotizar ahora",
  primaryHref = "/quote",
  secondaryText = "Ver planes",
  secondaryHref = "/plans",
  logoSrc = "/brand/logonegro.png",
  logoAlt = "San Cayetano Seguros",
}) {
  const { user } = useAuth();
  const isAdmin = !!(user?.is_admin || user?.isAdmin || user?.is_staff);
  const isLogged = !!user;
  const panelHref = isAdmin ? "/admin" : "/dashboard/seguro";
  const panelLabel = isAdmin ? "Admin" : "Mi panel";

  return (
    <section className="hero hero--full hero--light" id="hero">
      <div className="hero__inner container">
        <div className="hero__grid">
          {/* Logo a la izquierda */}
          <div className="hero__logo anim-logo">
            <img src={logoSrc} alt={logoAlt} />
          </div>

          {/* Contenido textual a la derecha */}
          <div className="hero__content anim-content">
            <h1 className="hero__title">{title}</h1>
            <p className="hero__subtitle">{subtitle}</p>
            <div className="hero__actions">
              <Link to={primaryHref} className="hero__btn hero__btn--primary">
                {primaryText}
              </Link>
              <Link to={isLogged ? panelHref : "/login"} className="hero__btn hero__btn--ghost">
                {isLogged ? panelLabel : "Ingresar"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
