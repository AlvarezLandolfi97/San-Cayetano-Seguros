import { Link } from "react-router-dom";
import "@/styles/Home.css";

/**
 * Props esperadas:
 * - code (Plan A/B/D/P)
 * - name (RC, Auto Total, etc.)
 * - subtitle (opcional)
 * - bullets: string[]
 * - modalitiesTitle?: string
 * - modalities?: string[]
 */
export default function InsuranceTypeCard({ type }) {
  if (!type) return null;
  const { code, name, subtitle, bullets = [], modalitiesTitle, modalities = [] } = type;

  return (
    <article className="plan-card">
      <header className="plan-card__header">
        <h3 className="plan-card__title">
          <span className="plan-card__code">{code}</span>
          <span className="plan-card__name">{name}</span>
        </h3>
        {subtitle && <p className="plan-card__subtitle">{subtitle}</p>}
      </header>

      {!!bullets.length && (
        <>
          <h4 className="plan-card__section-title">Este plan incluye</h4>
          <ul className="plan-card__list">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </>
      )}

      {!!modalities.length && (
        <>
          <h4 className="plan-card__section-title">
            {modalitiesTitle || "Modalidades"}
          </h4>
          <ul className="plan-card__list">
            {modalities.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </>
      )}

      <footer className="plan-card__footer">
        <Link to="/quote" className="btn btn--secondary">Cotizar este plan</Link>
      </footer>
    </article>
  );
}
