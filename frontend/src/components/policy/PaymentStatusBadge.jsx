export default function PaymentStatusBadge({ status }) {
  const map = {
    paid: { label: "Pagada", className: "badge badge--paid" },
    pending: { label: "Pendiente", className: "badge badge--pending" },
    failed: { label: "Fallida", className: "badge badge--failed" },
  };
  const info = map[status] || { label: String(status || "N/D"), className: "badge" };
  return <span className={info.className}>{info.label}</span>;
}
