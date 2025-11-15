import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import "@/styles/Login.css";

function isAdminUser(u) {
  if (!u) return false;
  const flag = u.is_admin ?? u.isAdmin ?? u.is_staff ?? u.admin ?? u.role;
  if (typeof flag === "string") {
    const s = flag.toLowerCase();
    if (s === "admin") return true;
    if (["true", "1", "yes", "si"].includes(s)) return true;
  }
  if (typeof flag === "number") return flag === 1;
  if (typeof flag === "boolean") return flag === true;
  return u.role === "admin";
}

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

    if (!form.email) return setErr("Ingresá tu email.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErr("Ingresá un email válido.");
    if (!form.password) return setErr("Ingresá tu contraseña.");

    try {
      setLoading(true);

      // Esperamos que login devuelva el usuario (ya normalizado en AuthProvider)
      const user = await login({
        email: form.email.trim(),
        password: form.password,
        remember: form.remember,
      });

      // Fallback por las dudas (usa tu clave real en LS)
      const lsUser = (() => {
        try { return JSON.parse(localStorage.getItem("sc_user") || "null"); }
        catch { return null; }
      })();

      const admin = isAdminUser(user) || isAdminUser(lsUser);

      // Evitamos que un "from" previo mande a un admin al dashboard de cliente
      const from = loc.state?.from;
      const blocked = new Set(["/", "/login", "/register", "/admin", "/dashboard", "/dashboard/seguro"]);
      const canUseFrom = from && !blocked.has(from);

      const target = admin ? "/admin" : (canUseFrom ? from : "/dashboard/seguro");
      nav(target, { replace: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.response?.data?.error ||
        "No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="login-page">
      <div className="login-card" role="region" aria-label="Acceso a la cuenta">
        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-subtitle">Accedé a tus pólizas, pagos y comprobantes.</p>

        {err && (
          <div className="login-alert" role="alert" aria-live="assertive">
            {err}
          </div>
        )}

        <form className="login-form" onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={form.email}
              onChange={onChange}
              placeholder="usuario@dominio.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrap">
              <input
                id="password"
                name="password"
                type={form.reveal ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={onChange}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="reveal-btn"
                aria-label={form.reveal ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setForm((f) => ({ ...f, reveal: !f.reveal }))}
                disabled={loading}
                title={form.reveal ? "Ocultar" : "Mostrar"}
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
                disabled={loading}
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

          <div className="auth__divider">
            <span>o</span>
          </div>

          <div className="google-login" aria-hidden={loading}>
            <GoogleLoginButton onErrorMessage={setErr} disabled={loading} />
          </div>

          <p className="login-register">
            ¿No tenés cuenta?{" "}
            <Link to="/register" className="link">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>

      <style>{`
        .auth__divider { display:flex; align-items:center; gap:.75rem; color:#666; margin:1rem 0; }
        .auth__divider::before, .auth__divider::after { content:""; flex:1; height:1px; background:#e0e0e0; }
        .google-login { display:flex; justify-content:center; }
      `}</style>
    </main>
  );
}
