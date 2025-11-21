import { Link } from "react-router-dom";
import "./footer.css";

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer__inner">
        {/* ===== Columna 1 — Marca ===== */}
        <div className="footer__col footer__brand">
          <img
            src="/brand/logocompleto.png"
            alt="San Cayetano Seguros"
            className="footer__logo"
          />
          <p className="footer__desc">
            Protegemos tu auto y tu moto, sin vueltas.
          </p>
        </div>

        {/* ===== Columna 2 — Enlaces ===== */}
        <div className="footer__col">
          <h3 className="footer__title">Enlaces</h3>
          <ul className="footer__list">
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/quote">Cotizar</Link></li>
            <li><Link to="/plans">Planes</Link></li>
            <li><Link to="/how-it-works">Cómo funciona</Link></li>
            <li><Link to="/login">Mi cuenta</Link></li>
          </ul>
        </div>

        {/* ===== Columna 3 — Contacto ===== */}
        <div className="footer__col">
          <h3 className="footer__title">Contacto</h3>
          <ul className="footer__list">
            <li><strong>WhatsApp:</strong> <a href="https://wa.me/5492210000000" target="_blank">+54 9 221 000-0000</a></li>
            <li><strong>Email:</strong> <a href="mailto:hola@sancayetano.com">hola@sancayetano.com</a></li>
            <li><strong>Horario:</strong> Lun a Vie 9–18 h</li>
          </ul>
        </div>
      </div>

      <hr className="footer__divider" />

      {/* ===== Créditos ===== */}
      <div className="footer__bottom container">
        <p className="footer__copy">
          © {new Date().getFullYear()} San Cayetano Seguros. Todos los derechos reservados.
        </p>
        <p className="footer__dev">
          Desarrollado por{" "}
          <a href="https://tuportafolio.dev" target="_blank" rel="noopener noreferrer">
            Emanuel Anita
          </a>
        </p>
      </div>
    </footer>
  );
}
