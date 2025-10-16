import { Link } from "react-router-dom";
import "./PlanCard.css";

export default function PlanCard({
  name,
  subtitle,
  tag,
  features = [],
  onQuoteHref = "/quote",
  onDetailsHref = "/plans",
}) {
  return (
    <article className="plan-card">
      <header className="plan-card__header">
        <h3 className="plan-card__title">{name}</h3>
        {subtitle && <p className="plan-card__tagline">{subtitle}</p>}
        {tag && <span className="plan-card__badge">{tag}</span>}
      </header>

      <ul className="plan-card__list">
        {features.map((f, i) => (
          <li key={i} className="plan-card__item">
            <span className="dot" /> {f}
          </li>
        ))}
      </ul>

      <footer className="plan-card__footer">
        <div className="plan-card__actions">
          <Link to={onDetailsHref} className="btn btn--secondary">
            Ver detalles
          </Link>
          <Link to={onQuoteHref} className="btn btn--primary">
            Cotizar
          </Link>
        </div>
      </footer>
    </article>
  );
}
