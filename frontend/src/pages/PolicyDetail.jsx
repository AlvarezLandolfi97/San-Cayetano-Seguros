import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api";
import PaymentStatusBadge from "@/components/policy/PaymentStatusBadge";
import ReceiptList from "@/components/policy/ReceiptList";

export default function PolicyDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try {
        const [d, r] = await Promise.all([
          api.get(`/policies/${id}`),
          api.get(`/policies/${id}/receipts`)
        ]);
        setDetail(d.data);
        setReceipts(r.data || []);
      } finally {
        setLoading(false);
      }
    })();
  },[id]);

  if (loading) return null;
  if (!detail) return <section className="section container"><p>No encontramos la póliza.</p></section>;

  return (
    <section className="section container">
      <header style={{display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
        <h1 style={{margin:0}}>Póliza #{detail.number || detail.id}</h1>
        <PaymentStatusBadge status={detail.status} />
      </header>

      <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, marginTop:16}}>
        <article className="card">
          <h3>Datos del vehículo</h3>
          <ul>
            <li><b>Patente:</b> {detail.plate || "-"}</li>
            <li><b>Marca/Modelo/Versión:</b> {detail.make} {detail.model} {detail.version}</li>
            <li><b>Año:</b> {detail.year}</li>
            <li><b>Localidad:</b> {detail.city}</li>
            <li><b>Garage:</b> {detail.has_garage ? "Sí" : "No"}</li>
            <li><b>0 km:</b> {detail.is_zero_km ? "Sí" : "No"}</li>
            <li><b>Uso:</b> {detail.usage || "-"}</li>
            <li><b>GNC:</b> {detail.has_gnc ? `Sí ($${Number(detail.gnc_amount||0).toLocaleString()})` : "No"}</li>
          </ul>
        </article>

        <article className="card">
          <h3>Estado y vencimientos</h3>
          <ul>
            <li><b>Producto:</b> {detail.product}</li>
            <li><b>Próxima cuota:</b> {detail.next_due || "-"}</li>
            <li><b>Vence:</b> {detail.expires_at || "-"}</li>
            <li><b>Premio actual:</b> ${Number(detail.current_price || detail.premium || 0).toLocaleString()}</li>
          </ul>
          {detail.warnings?.length ? (
            <div style={{marginTop:8}}>
              <b>Alertas:</b>
              <ul>{detail.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
            </div>
          ) : null}
        </article>
      </div>

      <div style={{marginTop:16}}>
        <h3>Comprobantes</h3>
        {receipts?.length ? (
          <ReceiptList receipts={receipts} />
        ) : <p>No hay comprobantes aún.</p>}
      </div>
    </section>
  );
}
