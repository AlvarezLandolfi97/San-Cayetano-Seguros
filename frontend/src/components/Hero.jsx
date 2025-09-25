import React from "react";
import "../styles/Hero.css";

export default function Hero({
  companyName = "San Cayetano",
  quoteHref = "/quote",
  whatsapp = "+54 9 221 000 0000",
  whatsappMsg = "Hola, quiero cotizar mi seguro vehicular."
}) {
  const normalizePhone = (p) => (p || "").replace(/\D/g, "");
  const waLink = `https://wa.me/${normalizePhone(whatsapp)}?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <section className="hero-scy" aria-label={`Seguros vehiculares - ${companyName}`}>
      <div className="hero-scy__inner">
        <div className="hero-scy__content">
          <h1 className="hero-scy__title">
            Protegé tu vehículo con <span className="hero-scy__highlight">{companyName}</span>
          </h1>
          <p className="hero-scy__subtitle">
            Cotizá online en minutos. Subí las 4 fotos del vehículo, validamos y pagás por Mercado Pago.
            Póliza al instante y asistencia de grúa 24/7.
          </p>

          <div className="hero-scy__actions">
            <a className="btn-scy btn-scy--primary" href={quoteHref}>
              Cotizar ahora
            </a>
            <a
              className="btn-scy btn-scy--outline"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hablar por WhatsApp"
            >
              Hablar por WhatsApp
            </a>
          </div>

          <ul className="hero-scy__chips" role="list">
            <li className="chip-scy">🚚 Grúa 24/7</li>
            <li className="chip-scy">⚡ Alta rápida</li>
            <li className="chip-scy">💳 Mercado Pago</li>
            <li className="chip-scy">🛡️ RC / Terceros / Todo Riesgo</li>
          </ul>
        </div>

        {/* Panel decorativo opcional (se oculta en mobile) */}
        <div className="hero-scy__panel" aria-hidden="true">
          <div className="hero-scy__badge">SC</div>
          <div className="hero-scy__card">
            <div className="hero-scy__card-title">Tu póliza</div>
            <div className="hero-scy__card-row">
              <span>Estado</span><b>Vigente</b>
            </div>
            <div className="hero-scy__card-row">
              <span>Próximo pago</span><b>12/10</b>
            </div>
            <div className="hero-scy__card-row">
              <span>Patente</span><b>AA123BB</b>
            </div>
          </div>
          <div className="hero-scy__waves" />
        </div>
      </div>
    </section>
  );
}
