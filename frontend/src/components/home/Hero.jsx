import { Link } from "react-router-dom";
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
              <Link to="/login" className="hero__btn hero__btn--ghost">
                Ingresar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
