import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchQuoteShare } from "@/services/quoteShare";
import "@/styles/QuoteShare.css";

export default function QuoteShare() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const legacyHash = useMemo(
    () => (!id ? decodeURIComponent(location.hash?.slice(1) || "") : ""),
    [id]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setData(null);
      try {
        if (id) {
          const res = await fetchQuoteShare(id);
          if (!cancelled) setData(res);
        } else if (legacyHash) {
          const { decompressFromEncodedURIComponent } = await import("lz-string");
          const json = decompressFromEncodedURIComponent(legacyHash);
          if (!json) throw new Error("No se pudo leer la información (enlace inválido o corrupto).");
          if (!cancelled) setData(JSON.parse(json));
        } else {
          throw new Error("No se encontró información en el enlace.");
        }
      } catch (e) {
        if (!cancelled) {
          const apiMsg = e?.response?.data?.detail || e?.response?.data?.error;
          const status = e?.response?.status;
          const friendly404 = status === 404 ? "La ficha no existe o ya no está disponible." : null;
          setError(friendly404 || apiMsg || e.message || "Error al leer la información.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, legacyHash]);

  if (error) {
    return (
      <main className="section container">
        <h1>Ficha de cotización</h1>
        <div className="share-alert" role="alert">{error}</div>
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="section container">
        <h1>Ficha de cotización</h1>
        <div className="share-card">
          <div className="share-skeleton" />
          <div className="share-skeleton" />
          <div className="share-skeleton" />
        </div>
      </main>
    );
  }

  const yn = (v) => (v ? "Sí" : "No");

  return (
    <main className="section container share">
      <header className="share-header">
        <div>
          <h1>Ficha de cotización</h1>
          <p className="muted">Vista de solo lectura con todos los datos enviados por el cliente.</p>
        </div>

        {(data.plan_code || data.plan_name) && (
          <span className="plan-chip" role="note" aria-label="Plan seleccionado">
            { [data.plan_code, data.plan_name].filter(Boolean).join(" — ") }
          </span>
        )}
      </header>

      {/* Datos de contacto */}
      <section className="share-card">
        <h3 className="share-title">Datos de contacto</h3>
        <div className="share-grid2">
          <div className="kv">
            <span className="k">WhatsApp</span>
            <span className="v">{data.phone || "-"}</span>
          </div>
        </div>
      </section>

      {/* Datos del vehículo */}
      <section className="share-card">
        <h3 className="share-title">Datos del vehículo</h3>

        <div className="share-grid2">
          <div className="kv">
            <span className="k">Marca/Modelo/Versión</span>
            <span className="v">
              {[data.make, data.model, data.version].filter(Boolean).join(" ")}
            </span>
          </div>
          <div className="kv">
            <span className="k">Año</span>
            <span className="v">{data.year || "-"}</span>
          </div>
          <div className="kv">
            <span className="k">Localidad</span>
            <span className="v">{data.city || "-"}</span>
          </div>
        </div>

        <div className="chip-row">
          <span className={`chip ${data.has_garage ? "ok" : "warn"}`}>Garage: {yn(data.has_garage)}</span>
          <span className={`chip ${data.is_zero_km ? "ok" : ""}`}>0 km: {yn(data.is_zero_km)}</span>
          <span className="chip">{`Uso: ${data.usage || "-"}`}</span>
          <span className={`chip ${data.has_gnc ? "ok" : ""}`}>
            {`GNC: ${yn(data.has_gnc)}`}
            {data.has_gnc && data.gnc_amount ? ` · $${data.gnc_amount}` : ""}
          </span>
        </div>
      </section>

      {/* Fotos */}
      <section className="share-card">
        <div className="share-title-row">
          <h3 className="share-title">Fotos del vehículo</h3>
          <span className="muted small">Frente · Atrás · Derecha · Izquierda</span>
        </div>

        <div className="photo-grid">
          <Figure src={data.photos?.front} label="Frente" />
          <Figure src={data.photos?.back} label="Atrás" />
          <Figure src={data.photos?.right} label="Derecha" />
          <Figure src={data.photos?.left} label="Izquierda" />
        </div>
      </section>
    </main>
  );
}

function Figure({ src, label }) {
  return (
    <figure className="photo">
      {src ? (
        <img src={src} alt={label} loading="lazy" />
      ) : (
        <div className="photo-missing">Sin imagen</div>
      )}
      <figcaption>{label}</figcaption>
    </figure>
  );
}
