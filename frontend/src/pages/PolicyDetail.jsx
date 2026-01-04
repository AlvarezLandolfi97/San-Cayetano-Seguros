import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import PaymentStatusBadge from "@/components/policy/PaymentStatusBadge";
import ReceiptList from "@/components/policy/ReceiptList";

export default function PolicyDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(()=>{
    (async ()=>{
      try {
        setError("");
        const [d, r] = await Promise.all([
          api.get(`/policies/${id}`),
          api.get(`/policies/${id}/receipts`)
        ]);
        setDetail(d.data);
        setReceipts(r.data || []);
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          setError("Necesitás iniciar sesión para ver esta póliza.");
        } else {
          setError("No pudimos obtener la póliza.");
        }
      } finally {
        setLoading(false);
      }
    })();
  },[id]);

  if (loading) return null;
  if (error) {
    return (
      <section className="section container">
        <p>{error}</p>
        {(error.includes("iniciar sesión")) && (
          <p>
            <Link to={`/login`} state={{ from: `/policy/${id}` }}>Ir a iniciar sesión</Link>
          </p>
        )}
      </section>
    );
  }
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
            <li><b>Vencimiento visible:</b> {detail.client_end_date || detail.end_date || "-"}</li>
            <li><b>Vigencia real:</b> {detail.real_end_date || "-"}</li>
            <li><b>Periodo de pago:</b> {(detail.payment_start_date && detail.payment_end_date) ? `${detail.payment_start_date} → ${detail.payment_end_date}` : detail.payment_start_date || detail.payment_end_date || "-"}</li>
            <li><b>Período de ajuste:</b>{" "}
              {(() => {
                const adjFrom = detail.adjustment_from ?? detail.adjustmentFrom;
                const adjTo = detail.adjustment_to ?? detail.adjustmentTo;
                const label = [adjFrom, adjTo].filter(Boolean).join(" → ");
                return label || "-";
              })()}
            </li>
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
