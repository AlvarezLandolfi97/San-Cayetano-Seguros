import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import { isEmail, isStrongPassword } from "@/validators";
import "@/styles/Register.css";

function calcAge(isoDate) {
  if (!isoDate) return 0;
  const d = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function normalizePhone(v) {
  // Limpia espacios y guiones; si no tiene + al inicio, intenta E.164 simple
  const raw = String(v || "").replace(/\s|-/g, "");
  if (raw.startsWith("+")) return raw;
  // Heurística simple: agrega '+' si son solo dígitos
  if (/^\d{6,}$/.test(raw)) return `+${raw}`;
  return raw;
}

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    dni: "",
    phone: "",
    dob: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const maxDob = useMemo(() => {
    const t = new Date();
    t.setFullYear(t.getFullYear() - 18);
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${t.getFullYear()}-${mm}-${dd}`;
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    // 🧠 Validaciones
    if (!form.first_name.trim()) return setErr("Ingresá tu nombre.");
    if (!form.last_name.trim()) return setErr("Ingresá tu apellido.");
    if (!isEmail(form.email)) return setErr("Email inválido.");
    if (!/^\d{7,8}$/.test(form.dni)) return setErr("DNI inválido (7 u 8 dígitos).");

    if (!form.phone.trim()) return setErr("Ingresá tu número de teléfono.");
    const phone = normalizePhone(form.phone);
    if (!/^\+\d{6,}$/.test(phone))
      return setErr("El número de teléfono no tiene un formato válido. Ej: +54 9 221....");

    if (!form.dob) return setErr("Ingresá tu fecha de nacimiento.");
    if (calcAge(form.dob) < 18)
      return setErr("Debés ser mayor de 18 años para registrarte.");

    // Asegurate que isStrongPassword verifique al menos 6 chars;
    // si tu validador es más estricto, adaptá este mensaje:
    if (!isStrongPassword(form.password))
      return setErr("La contraseña debe tener al menos 6 caracteres.");
    if (form.password !== form.confirm_password)
      return setErr("Las contraseñas no coinciden.");

    try {
      setLoading(true);
      const payload = {
        // Si tu backend espera first_name/last_name por separado, enviálos así:
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        email: form.email.trim(),
        dni: form.dni.trim(),
        phone,
        dob: form.dob,
        password: form.password,
      };
      await register(payload);
      // Al registrarse, lo llevamos directo a su panel:
      nav("/dashboard/seguro", { replace: true });
    } catch (e2) {
      // Intenta mapear errores comunes del backend
      const d = e2?.response?.data;
      const generic = "No pudimos crear tu cuenta.";
      if (typeof d === "string") return setErr(d || generic);
      if (d?.detail) return setErr(d.detail);
      if (d?.email?.[0]) return setErr(`Email: ${d.email[0]}`);
      if (d?.dni?.[0]) return setErr(`DNI: ${d.dni[0]}`);
      setErr(generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="register-page">
      <div className="register-card">
        <h1 className="register-title">Crear cuenta</h1>
        <p className="register-subtitle">
          Registrate para gestionar tus pólizas y comprobantes.
        </p>

        {err && (
          <div className="register-alert" role="alert" aria-live="assertive">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="register-form" noValidate>
          {/* Nombre y Apellido */}
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={onChange}
                required
                autoComplete="given-name"
              />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={onChange}
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              required
              autoComplete="email"
            />
          </div>

          {/* DNI + Teléfono */}
          <div className="form-row">
            <div className="form-group">
              <label>DNI</label>
              <input
                name="dni"
                inputMode="numeric"
                value={form.dni}
                onChange={onChange}
                required
                placeholder="12345678"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label>Teléfono (WhatsApp)</label>
              <input
                name="phone"
                placeholder="+54 9 ..."
                value={form.phone}
                onChange={onChange}
                inputMode="tel"
                required
                autoComplete="tel"
              />
              <small className="hint">Formato recomendado: +54 9 221 ...</small>
            </div>
          </div>

          {/* Fecha de nacimiento */}
          <div className="form-group">
            <label>Fecha de nacimiento</label>
            <input
              name="dob"
              type="date"
              value={form.dob}
              onChange={onChange}
              max={maxDob}
              required
            />
            <small className="hint">Debés ser mayor de 18 años.</small>
          </div>

          {/* Contraseña + Confirmación */}
          <div className="form-row">
            <div className="form-group">
              <label>Contraseña</label>
              <div className="password-field">
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={onChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="btn btn--ghost btn-eye"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              <small className="hint">Mínimo 6 caracteres.</small>
            </div>

            <div className="form-group">
              <label>Confirmar contraseña</label>
              <div className="password-field">
                <input
                  name="confirm_password"
                  type={showPass2 ? "text" : "password"}
                  value={form.confirm_password}
                  onChange={onChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="btn btn--ghost btn-eye"
                  onClick={() => setShowPass2((v) => !v)}
                  aria-label={showPass2 ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass2 ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary register-btn"
            disabled={loading}
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>

          <p className="register-login">
            ¿Ya tenés cuenta?{" "}
            <Link to="/login" className="link">
              Iniciá sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
