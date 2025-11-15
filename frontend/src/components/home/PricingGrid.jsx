import { Link } from "react-router-dom";
import "@/styles/PricingGrid.css";

/**
 * items: [{ code, id?, name, subtitle?, features?: string[] }]
 */
export default function PricingGrid({ items = [] }) {
  if (!items?.length) return null;

  return (
    <div className="pricing-grid">
      {items.map((p, i) => {
        const key =
          String(p.code ?? "") ||
          String(p.id ?? "") ||
          `${p.name ?? "plan"}-${i}`;

        const qs = new URLSearchParams({
          plan: p.code ?? p.name ?? "",
          plan_name: p.name ?? p.code ?? "",
        }).toString();

        return (
          <article key={key} className="pricing-card">
            <header className="pricing-card__header">
              {p.code && <span className="pricing-card__badge">{p.code}</span>}
              <h3 className="pricing-card__title">{p.name}</h3>
              {p.subtitle && (
                <p className="pricing-card__subtitle">{p.subtitle}</p>
              )}
            </header>

            {Array.isArray(p.features) && p.features.length > 0 && (
              <ul className="pricing-card__list">
                {p.features.map((f, idx) => (
                  <li key={`${key}-f-${idx}`}>{f}</li>
                ))}
              </ul>
            )}

            <footer className="pricing-card__footer">
              <Link to={`/quote?${qs}`} className="btn btn--outline">
                Cotizar este plan
              </Link>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
