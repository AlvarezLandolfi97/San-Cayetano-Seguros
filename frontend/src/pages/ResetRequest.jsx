import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "../styles/reset.css";

export default function ResetRequest() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const isEmail = (v) => /\S+@\S+\.\S+/.test(v);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!isEmail(email)) return setErr("Ingresá un email válido.");

    try {
      setLoading(true);
      await api.post("/auth/password/reset", { email: email.trim() });
      setSent(true); // No mostramos si existe o no; siempre éxito.
    } catch (e2) {
      // Por seguridad, también mostramos éxito aunque el backend retorne 200 de todos modos.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="reset-page">
      <div className="reset-card">
        <h1 className="reset-title">Recuperar contraseña</h1>
        <p className="reset-subtitle">
          Ingresá tu email y te enviaremos un enlace para restablecerla.
        </p>

        {sent ? (
          <div className="reset-success" role="status" aria-live="polite">
            Si el correo existe, vas a recibir un email con instrucciones.
          </div>
        ) : (
          err && (
            <div className="reset-alert" role="alert" aria-live="assertive">
              {err}
            </div>
          )
        )}

        {!sent ? (
          <form className="reset-form" onSubmit={onSubmit} noValidate>
            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary reset-btn"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>

            <p className="reset-links">
              <Link to="/login" className="link">Volver a iniciar sesión</Link>
            </p>
          </form>
        ) : (
          <p className="reset-links">
            <Link to="/login" className="link">Volver a iniciar sesión</Link>
          </p>
        )}
      </div>
    </main>
  );
}
