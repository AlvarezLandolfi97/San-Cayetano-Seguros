import { Link } from "react-router-dom";
import PlanCard from "./PlanCard";
import "@/styles/PlansSection.css";

export default function PlansSection({
  plans = [],
  loading = false,
  onQuote,
  title = "Nuestros seguros",
  subtitle = "Elegí el plan que mejor se adapte a vos y a tu vehículo.",
}) {
  return (
    <section className="plans" id="planes">
      <div className="plans__inner">
        <div className="plans__header">
          <div>
            <h2 className="plans__title">{title}</h2>
            <p className="plans__subtitle">{subtitle}</p>
          </div>
        </div>

        {loading ? (
          <div className="plans__grid">
            {[1, 2, 3, 4].map((k) => (
              <article key={`sk-${k}`} className="plan skeleton">
                <div className="sk-title" />
                <div className="sk-line" />
                <div className="sk-line" />
                <div className="sk-btn" style={{ width: 160, marginTop: 8 }} />
              </article>
            ))}
          </div>
        ) : (
          <div className="plans__grid">
            {plans.map((p, idx) => (
              <PlanCard key={p.id || p.code || idx} plan={p} onQuote={onQuote} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
