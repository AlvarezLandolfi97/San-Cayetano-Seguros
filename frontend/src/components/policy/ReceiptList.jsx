export default function ReceiptList({ receipts = [] }) {
  if (!receipts.length) return <p>No hay recibos aún.</p>;
  return (
    <ul className="receipt-list">
      {receipts.map(r => (
        <li key={r.id || r.number}>
          <a href={r.url} target="_blank" rel="noreferrer">
            Recibo #{r.number || r.id}
          </a>{" "}
          — {r.date || ""}
        </li>
      ))}
    </ul>
  );
}
