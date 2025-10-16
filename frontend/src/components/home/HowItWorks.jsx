import { Link } from "react-router-dom";
import "./HowItWorks.css";

/**
 * Sección "Cómo funciona"
 * - 4 pasos: Cotizar → Registrarse → Pagar → Gestionar
 * - Diseño claro, minimalista y responsivo
 */
export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      title: "Llená el formulario de cotización",
      desc: "Ingresá los datos de tu vehículo y obtené una cotización inmediata.",
      Icon: FormIcon,
    },
    {
      id: 2,
      title: "Registrate",
      desc: "Creá tu cuenta para guardar tus datos y acceder a tus pólizas.",
      Icon: UserIcon,
    },
    {
      id: 3,
      title: "Pagá online",
      desc: "Completá el pago de forma rápida y segura con Mercado Pago.",
      Icon: PaymentIcon,
    },
    {
      id: 4,
      title: "Gestioná tus seguros",
      desc: "Accedé a tu panel para ver tus pólizas, comprobantes y vencimientos.",
      Icon: DashboardIcon,
    },
  ];

  return (
    <section className="hiw" aria-labelledby="hiw-title">
      <div className="container">
        <header className="hiw__head">
          <h2 id="hiw-title" className="hiw__title">Cómo funciona</h2>
          <p className="hiw__subtitle text-muted">
            Desde la cotización hasta la gestión de tus seguros, todo online.
          </p>
        </header>

        <ol className="hiw__grid">
          {steps.map(({ id, title, desc, Icon }) => (
            <li className="hiw__item" key={id}>
              <span className="hiw__step" aria-hidden="true">{id}</span>
              <div className="hiw__icon" aria-hidden="true">
                <Icon />
              </div>
              <h3 className="hiw__itemTitle">{title}</h3>
              <p className="hiw__itemDesc">{desc}</p>
            </li>
          ))}
        </ol>

        <div className="hiw__cta">
          <Link to="/quote" className="btn btn--primary">Empezar cotización</Link>
        </div>
      </div>
    </section>
  );
}

/* ----- ÍCONOS SVG minimalistas (sin dependencias externas) ----- */
function FormIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="img">
      <path fill="currentColor" d="M4 3h16a1 1 0 0 1 1 1v16l-4-3H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/>
      <path fill="#0a2a6b" d="M7 7h10v2H7zm0 4h6v2H7z"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="img">
      <circle cx="12" cy="8" r="4" fill="#0a2a6b"/>
      <path fill="currentColor" d="M4 20c0-4 4-6 8-6s8 2 8 6v1H4v-1Z"/>
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="img">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor"/>
      <rect x="3" y="9" width="18" height="2" fill="#0a2a6b"/>
      <circle cx="17" cy="15" r="1" fill="#fff"/>
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="img">
      <rect x="3" y="3" width="8" height="8" fill="#0a2a6b"/>
      <rect x="13" y="3" width="8" height="5" fill="currentColor"/>
      <rect x="13" y="10" width="8" height="11" fill="#0a2a6b"/>
      <rect x="3" y="13" width="8" height="8" fill="currentColor"/>
    </svg>
  );
}
