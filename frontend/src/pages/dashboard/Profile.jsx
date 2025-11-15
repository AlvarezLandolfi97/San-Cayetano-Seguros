import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import useAuth from "@/hooks/useAuth";
import "../../styles/profile.css";

export default function Profile() {
  const { user, setSession } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name:  user?.last_name  || "",
    email:      user?.email      || "",
    phone:      user?.phone      || "",
    dni:        user?.dni        || "",
    dob:        user?.dob        || "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  // Cargar datos existentes (prefill inmediato con user y luego refresco de API)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/users/me");
        if (!mounted) return;
        setForm({
          first_name: data.first_name || "",
          last_name:  data.last_name  || "",
          email:      data.email      || "",
          phone:      data.phone      || "",
          dni:        data.dni        || "",
          dob:        data.dob        || "",
        });
      } catch (err) {
        // Si falla, mantenemos los datos de session como fallback
        setError("No se pudo cargar tu perfil. Intentá nuevamente.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
    setError("");
  }

  const isDirty = useMemo(() => {
    // Comparamos contra user en memoria — es suficiente para habilitar/deshabilitar el botón
    if (!user) return true;
    return (
      (form.first_name || "") !== (user.first_name || "") ||
      (form.last_name  || "") !== (user.last_name  || "") ||
      (form.email      || "") !== (user.email      || "") ||
      (form.phone      || "") !== (user.phone      || "") ||
      (form.dni        || "") !== (user.dni        || "") ||
      (form.dob        || "") !== (user.dob        || "")
    );
  }, [form, user]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put("/users/me", form);
      setSession({ user: { ...user, ...data } });
      setSaved(true);
    } catch (err) {
      setError("No se pudieron guardar los cambios. Revisá los datos e intentá otra vez.");
    } finally {
      setSaving(false);
    }
  }

  // Avatar con iniciales
  const initials = useMemo(() => {
    const fn = (form.first_name || "").trim();
    const ln = (form.last_name || "").trim();
    return `${fn?.[0] || ""}${ln?.[0] || ""}`.toUpperCase();
  }, [form.first_name, form.last_name]);

  return (
    <section className="dash-section">
      <div className="dash-card profile-card">
        <div className="card-header">
          <div className="avatar" aria-hidden>
            <span>{initials || "U"}</span>
          </div>
          <div className="title-wrap">
            <h1 className="card-title">Mi perfil</h1>
            <p className="card-subtitle">Gestioná tus datos personales vinculados a tu cuenta.</p>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-grid" role="status" aria-live="polite">
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="profile-form" noValidate>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="first_name">Nombre</label>
                <input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => setField("first_name", e.target.value)}
                  autoComplete="given-name"
                />
              </div>

              <div className="field">
                <label htmlFor="last_name">Apellido</label>
                <input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setField("last_name", e.target.value)}
                  autoComplete="family-name"
                />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                />
                <small className="hint">Usamos este correo para avisos y comprobantes.</small>
              </div>

              <div className="field">
                <label htmlFor="phone">Teléfono</label>
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>

              <div className="field">
                <label htmlFor="dni">DNI</label>
                <input
                  id="dni"
                  value={form.dni}
                  onChange={(e) => setField("dni", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="field">
                <label htmlFor="dob">Fecha de nacimiento</label>
                <input
                  id="dob"
                  type="date"
                  value={form.dob || ""}
                  onChange={(e) => setField("dob", e.target.value)}
                />
              </div>
            </div>

            {!!error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}

            <div className="actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!isDirty || saving}
                aria-busy={saving}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

              {saved && !saving && (
                <span className="saved-indicator" aria-live="polite">
                  ✓ Guardado
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
