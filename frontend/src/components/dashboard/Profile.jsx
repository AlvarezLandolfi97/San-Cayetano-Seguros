// frontend/src/components/dashboard/Profile.jsx
import { useMemo, useState } from "react";
import "./Profile.css";

const INITIAL = {
  first_name: "Emanuel",
  last_name: "Sierra",
  email: "emanuel@ejemplo.com",
  phone: "+54 9 221 000 0000",
  birth_date: "1995-08-10",
};

function getAge(iso) {
  if (!iso) return 0;
  const d = new Date(iso);
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return age;
}

export default function Profile() {
  const [form, setForm] = useState(INITIAL);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(INITIAL),
    [form]
  );

  const validate = (state) => {
    const e = {};
    if (!state.first_name?.trim()) e.first_name = "Ingresá tu nombre.";
    if (!state.last_name?.trim()) e.last_name = "Ingresá tu apellido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email || ""))
      e.email = "Correo inválido.";
    if (!state.phone?.trim()) e.phone = "El teléfono es requerido.";
    if (getAge(state.birth_date) < 18)
      e.birth_date = "Debés ser mayor de 18 años.";
    return e;
  };

  const isValid = useMemo(() => {
    const e = validate(form);
    setErrors((prev) => (JSON.stringify(prev) !== JSON.stringify(e) ? e : prev));
    return Object.keys(e).length === 0;
  }, [form]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const eMap = validate(form);
    setErrors(eMap);
    if (Object.keys(eMap).length) return;

    // TODO: fetch PATCH /api/users/me/ con el token
    // await fetch('/api/users/me/', { method:'PATCH', body: JSON.stringify(form) ... })

    // Simula éxito
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="profile-card">
      {/* Header con título y subtítulo */}
      <header className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {form.first_name?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div>
          <h2 className="profile-title">Mi perfil</h2>
          <p className="profile-subtitle">
            Actualizá tu información personal para mantener tus datos al día.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} noValidate>
        {/* Sección: datos personales */}
        <section className="profile-section">
          <h3 className="section-title">Información personal</h3>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="first_name">Nombre</label>
              <input
                id="first_name"
                name="first_name"
                className={`input ${errors.first_name ? "is-invalid" : ""}`}
                value={form.first_name}
                onChange={onChange}
                autoComplete="given-name"
              />
              {errors.first_name && <div className="field-error">{errors.first_name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="last_name">Apellido</label>
              <input
                id="last_name"
                name="last_name"
                className={`input ${errors.last_name ? "is-invalid" : ""}`}
                value={form.last_name}
                onChange={onChange}
                autoComplete="family-name"
              />
              {errors.last_name && <div className="field-error">{errors.last_name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="birth_date">Fecha de nacimiento</label>
              <input
                id="birth_date"
                name="birth_date"
                type="date"
                className={`input ${errors.birth_date ? "is-invalid" : ""}`}
                value={form.birth_date}
                onChange={onChange}
              />
              <div className="form-hint">Debés ser mayor de 18 años.</div>
              {errors.birth_date && <div className="field-error">{errors.birth_date}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">Teléfono</label>
              <input
                id="phone"
                name="phone"
                className={`input ${errors.phone ? "is-invalid" : ""}`}
                placeholder="+54 9 ..."
                value={form.phone}
                onChange={onChange}
                autoComplete="tel"
              />
              {errors.phone && <div className="field-error">{errors.phone}</div>}
            </div>
          </div>
        </section>

        {/* Sección: contacto */}
        <section className="profile-section">
          <h3 className="section-title">Contacto</h3>

          <div className="form-grid">
            <div className="form-group form-group--full">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input ${errors.email ? "is-invalid" : ""}`}
                value={form.email}
                onChange={onChange}
                autoComplete="email"
              />
              {errors.email && <div className="field-error">{errors.email}</div>}
            </div>
          </div>
        </section>

        {/* Savebar pegajosa (solo si hay cambios) */}
        {dirty && (
          <div className="savebar" role="region" aria-label="Acciones de guardado">
            {success && (
              <span className="toast-ok" role="status" aria-live="polite">
                Guardado ✓
              </span>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => setForm(INITIAL)}
            >
              Descartar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!isValid}
              aria-disabled={!isValid}
            >
              Guardar cambios
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
