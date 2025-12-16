import { useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/PlanCard.css";

export default function PlanCard({ plan, onQuote }) {
  const items = Array.isArray(plan.features) ? plan.features : [];
  const hasOverflow = items.length > 2;
  const previewItems = hasOverflow ? items.slice(0, 2) : items;
  const [showModal, setShowModal] = useState(false);

  const qs = new URLSearchParams({
    plan: plan.code || plan.name || "",
    plan_name: plan.name || plan.code || "",
  }).toString();

  return (
    <article className="plan">
      <h3 className="plan__title">{plan.name}</h3>
      {plan.subtitle && <p className="plan__subtitle">{plan.subtitle}</p>}

      {!!previewItems.length && (
        <div className="plan__list-wrapper">
          <ul className="plan__list">
            {previewItems.map((it, i) => (
              <li key={`${plan.code || plan.name}-it-${i}`}>{it}</li>
            ))}
          </ul>
          {hasOverflow && (
            <div
              className="plan__fade"
              role="button"
              tabIndex={0}
              onClick={() => setShowModal(true)}
              onKeyDown={(e) => e.key === "Enter" && setShowModal(true)}
            >
              Ver más
            </div>
          )}
        </div>
      )}

      <div className="plan__footer">
        <Link to={`/quote?${qs}`} className="plan__btn" onClick={() => onQuote?.(plan)}>
          Cotizar este plan
        </Link>
      </div>

      {showModal && (
        <div className="plan-modal">
          <div className="plan-modal__scrim" onClick={() => setShowModal(false)} />
          <div className="plan-modal__card">
            <header className="plan-modal__head">
              <div>
                <p className="plan-modal__eyebrow">Plan</p>
                <h3 className="plan__title">{plan.name}</h3>
                {plan.subtitle && <p className="plan__subtitle">{plan.subtitle}</p>}
              </div>
              <button className="plan-modal__close" onClick={() => setShowModal(false)} aria-label="Cerrar">×</button>
            </header>
            <div className="plan-modal__body">
              <ul className="plan__list plan__list--modal">
                {items.map((it, i) => (
                  <li key={`${plan.code || plan.name}-modal-${i}`}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="plan__footer">
              <Link
                to={`/quote?${qs}`}
                className="plan__btn"
                onClick={() => {
                  setShowModal(false);
                  onQuote?.(plan);
                }}
              >
                Cotizar este plan
              </Link>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
