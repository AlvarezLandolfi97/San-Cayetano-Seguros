import { Link } from "react-router-dom";
import "@/styles/PlanCard.css";

export default function PlanCard({ plan, onQuote }) {
  const items = Array.isArray(plan.features) ? plan.features : [];

  const qs = new URLSearchParams({
    plan: plan.code || plan.name || "",
    plan_name: plan.name || plan.code || "",
  }).toString();

  return (
    <article className="plan">
      <h3 className="plan__title">{plan.name}</h3>
      {plan.subtitle && <p className="plan__subtitle">{plan.subtitle}</p>}

      {!!items.length && (
        <ul className="plan__list">
          {items.map((it, i) => (
            <li key={`${plan.code || plan.name}-it-${i}`}>{it}</li>
          ))}
        </ul>
      )}

      <div className="plan__footer">
        <Link to={`/quote?${qs}`} className="plan__btn" onClick={() => onQuote?.(plan)}>
          Cotizar este plan
        </Link>
      </div>
    </article>
  );
}
