export default function ReceiptList({ receipts = [] }) {
  if (!receipts.length) return <p>No hay recibos aún.</p>;
  return (
    <ul className="receipt-list">
      {receipts.map(r => (
        <li key={r.id || r.number}>
          {r.file_url || r.url ? (
            <a href={r.file_url || r.url} target="_blank" rel="noreferrer">
              Recibo #{r.number || r.id}
            </a>
          ) : (
            <span>Recibo #{r.number || r.id}</span>
          )}{" "}
          — {r.date || ""}
        </li>
      ))}
    </ul>
  );
}
