import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import "../styles/reset.css";

const strongEnough = (p) => typeof p === "string" && p.length >= 6;

export default function ResetConfirm() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const uid = sp.get("uid") || "";
  const token = sp.get("token") || "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const linkValid = useMemo(() => !!uid && !!token, [uid, token]);

  useEffect(() => {
    // Podrías opcionalmente validar el token con un GET si tu backend lo ofrece.
  }, []);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!linkValid) return setErr("Enlace inválido o incompleto.");
    if (!strongEnough(form.password))
      return setErr("La contraseña debe tener al menos 6 caracteres.");
    if (form.password !== form.confirm)
      return setErr("Las contraseñas no coinciden.");

    try {
      setLoading(true);
      await api.post("/auth/password/reset/confirm", {
        uid,
        token,
        new_password: form.password,
      });
      setOk(true);
      setTimeout(() => nav("/login", { replace: true }), 1200);
    } catch (e2) {
      setErr(
        e2?.response?.data?.detail ||
          "No pudimos restablecer la contraseña. El enlace pudo haber expirado."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="reset-page">
      <div className="reset-card">
        <h1 className="reset-title">Definir nueva contraseña</h1>
        <p className="reset-subtitle">
          Ingresá tu nueva contraseña para completar el proceso.
        </p>

        {ok ? (
          <div className="reset-success" role="status" aria-live="polite">
            Contraseña actualizada. Redirigiendo al login…
          </div>
        ) : (
          err && (
            <div className="reset-alert" role="alert" aria-live="assertive">
              {err}
            </div>
          )
        )}

        {!ok && (
          <form className="reset-form" onSubmit={onSubmit} noValidate>
            <div className="form-group">
              <label>Nueva contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={onChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary reset-btn"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>

            <p className="reset-links">
              <Link to="/login" className="link">Volver a iniciar sesión</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
