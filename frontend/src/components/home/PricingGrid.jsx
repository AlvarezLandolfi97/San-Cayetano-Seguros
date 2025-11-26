import "@/styles/PricingGrid.css";
import PlanCard from "./PlanCard";

/**
 * items: [{ code, id?, name, subtitle?, features?: string[] }]
 */
export default function PricingGrid({ items = [], onQuote }) {
  if (!items?.length) return null;

  return (
    <div className="pricing-grid">
      {items.map((plan, i) => {
        const key =
          String(plan.code ?? "") ||
          String(plan.id ?? "") ||
          `${plan.name ?? "plan"}-${i}`;
        return <PlanCard key={key} plan={plan} onQuote={onQuote} />;
      })}
    </div>
  );
}
