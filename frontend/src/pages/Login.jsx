import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import "../styles/Login.css";

const isEmail = (v) => /\S+@\S+\.\S+/.test(v);

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: true,
    reveal: false,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!isEmail(form.email)) return setErr("Ingresá un email válido.");
    if (!form.password) return setErr("Ingresá tu contraseña.");

    try {
      setLoading(true);
      await login({
        email: form.email.trim(),
        password: form.password,
        remember: form.remember,
      });
      const redirectTo = loc.state?.from || "/dashboard";
      nav(redirectTo, { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "No pudimos iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="login-page">
      <div className="login-card" role="region" aria-label="Acceso a la cuenta">
        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-subtitle">
          Accedé a tu cuenta para ver tus pólizas y comprobantes.
        </p>

        {err && (
          <div className="login-alert" role="alert" aria-live="assertive">
            {err}
          </div>
        )}

        <form className="login-form" onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={onChange}
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="password-wrap">
              <input
                name="password"
                type={form.reveal ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={onChange}
                required
              />
              <button
                type="button"
                className="reveal-btn"
                aria-label={
                  form.reveal ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setForm((f) => ({ ...f, reveal: !f.reveal }))}
              >
                {form.reveal ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="form-row between">
            <label className="check">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remember: e.target.checked }))
                }
              />
              <span>Recordarme</span>
            </label>

            <Link to="/reset" className="link small">
              Olvidé mi contraseña
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn--primary login-btn"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="login-register">
            ¿No tenés cuenta?{" "}
            <Link to="/register" className="link">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
