import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { isEmail, isStrongPassword } from "../validators";
import "../styles/Register.css";

function calcAge(isoDate) {
  if (!isoDate) return 0;
  const d = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
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
    if (!/^\d{7,8}$/.test(form.dni)) return setErr("DNI inválido.");
    if (!form.phone.trim()) return setErr("Ingresá tu número de teléfono.");
    if (!/^\+?\d{6,}$/.test(form.phone))
      return setErr("El número de teléfono no tiene un formato válido.");
    if (!form.dob) return setErr("Ingresá tu fecha de nacimiento.");
    if (calcAge(form.dob) < 18)
      return setErr("Debés ser mayor de 18 años para registrarte.");
    if (!isStrongPassword(form.password))
      return setErr("La contraseña debe tener al menos 6 caracteres.");
    if (form.password !== form.confirm_password)
      return setErr("Las contraseñas no coinciden.");

    try {
      setLoading(true);
      const payload = {
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        email: form.email.trim(),
        dni: form.dni.trim(),
        phone: form.phone.trim(),
        dob: form.dob,
        password: form.password,
      };
      await register(payload);
      nav("/dashboard");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "No pudimos crear tu cuenta.");
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
              />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={onChange}
                required
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
              />
            </div>

            <div className="form-group">
              <label>Teléfono (WhatsApp)</label>
              <input
                name="phone"
                placeholder="+54 9 ..."
                value={form.phone}
                onChange={onChange}
                required
              />
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
          </div>

          {/* Contraseña + Confirmación */}
          <div className="form-row">
            <div className="form-group">
              <label>Contraseña</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirmar contraseña</label>
              <input
                name="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={onChange}
                required
              />
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
