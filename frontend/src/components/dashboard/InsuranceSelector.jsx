import { useMemo } from "react";
import "./Dashboard.css";

/**
 * Selector de póliza (combobox)
 * props:
 *  - policies: [{id, product_name, vehicle:{brand,model,plate}}, ...]
 *  - selected: id actual (number|string|null)
 *  - onChange: fn(id)
 */
export default function InsuranceSelector({ policies = [], selected, onChange }) {
  const options = useMemo(() => {
    return policies.map(p => ({
      value: String(p.id),
      label:
        p.vehicle
          ? `${p.vehicle?.brand ?? ""} ${p.vehicle?.model ?? ""} · ${p.product_name ?? "Cobertura"}`
          : `${p.product_name ?? "Cobertura"} (#${p.id})`,
    }));
  }, [policies]);

  if (!policies?.length) {
    return (
      <div className="ins-selector ins-selector--empty" aria-live="polite">
        <span>Sin pólizas para mostrar…</span>
      </div>
    );
  }

  return (
    <label className="ins-selector">
      <span className="ins-selector__label">Póliza</span>
      <select
        className="ins-selector__select"
        value={selected ? String(selected) : options[0]?.value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
