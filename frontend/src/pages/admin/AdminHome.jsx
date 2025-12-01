import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import useAuth from "@/hooks/useAuth";

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const end = new Date(dateStr + "T00:00:00");
  const today = new Date();
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = end - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function AdminHome() {
  const { user, setSession } = useAuth();
  const [profile, setProfile] = useState({ email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [threshold, setThreshold] = useState(7);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [expiringCount, setExpiringCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const showExpiringAlert = expiringCount > 0 && !loading;

  useEffect(() => {
    if (user) {
      setProfile({
        email: user.email || "",
      });
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        // threshold
        try {
          const { data } = await api.get("/admin/settings");
          const n = Number(data?.expiring_threshold_days);
          if (Number.isFinite(n) && n > 0) setThreshold(n);
        } catch {
          /* silent */
        }

        // expiring
        try {
          const { data } = await api.get("/admin/policies");
          const arr = (Array.isArray(data?.results) ? data.results : data) || [];
          const count = arr.filter((p) => {
            const d = daysUntil(p.end_date);
            return p.status === "active" && d >= 0 && d <= threshold;
          }).length;
          setExpiringCount(count);
        } catch {
          setExpiringCount(0);
        }
      } catch (e) {
        setErr(e?.response?.data?.detail || "No se pudo cargar la información.");
      } finally {
        setLoading(false);
      }
    })();
  }, [threshold]);

  async function saveProfile(e) {
    e.preventDefault();
    if (!user?.id) return;
    if (password && password !== passwordConfirm) {
      setErr("Las contraseñas no coinciden.");
      return;
    }
    setSavingProfile(true);
    setErr("");
    try {
      const payload = { email: profile.email };
      if (password) payload.password = password;
      const { data } = await api.patch(`/admin/users/${user.id}`, payload);
      setSession({ user: data ? { ...user, ...data } : user });
      setPassword("");
      setPasswordConfirm("");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "No se pudo guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePrefs() {
    setSavingThreshold(true);
    setErr("");
    try {
      await api.patch("/admin/settings", { expiring_threshold_days: threshold });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "No se pudo guardar las preferencias.");
    } finally {
      setSavingThreshold(false);
    }
  }

  const expiringMsg = useMemo(() => {
    if (loading) return "Revisando pólizas…";
  }, [expiringCount, loading]);

  return (
    <section className="section container policies-page">
      <header className="admin__head">
        <div>
          <h1>Inicio admin</h1>
        </div>
      </header>

      {showExpiringAlert && (
        <div className="alert-bar alert-bar--danger">
          Hay {expiringCount} póliza(s) próximas a vencer”.
        </div>
      )}

      {err && <div className="register-alert mt-8">{err}</div>}

      <div className="card-like admin-home__card mb-12">
        <h3 className="heading-tight">Tus datos</h3>
        <form className="form" onSubmit={saveProfile}>
          <div className="grid admin-grid--auto-220">
            <div className="field">
              <label>Email</label>
              <input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar en blanco para no cambiarla"
              />
            </div>
            <div className="field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repetí la nueva contraseña"
              />
            </div>
          </div>
          <div className="actions actions--end">
            <button className="btn btn--primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "Guardando…" : "Guardar datos"}
            </button>
          </div>
        </form>
      </div>

      <div className="card-like admin-home__card mb-12">
        <h3 className="heading-tight">Preferencias</h3>
        <div className="admin-home__prefs">
          <div className="admin-home__prefs-row">
            <span className="muted">Avisar (y destacar) cuando falten</span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              disabled={savingThreshold}
            >
              {[3,5,7,10,15,20,30].map((n) => (
                <option key={n} value={n}>{n} días</option>
              ))}
            </select>
            <span className="muted">para el vencimiento.</span>
          </div>
          <div className="actions actions--end admin-home__prefs-actions">
            <button className="btn btn--primary" onClick={savePrefs} disabled={savingThreshold}>Guardar preferencia</button>
          </div>
        </div>
        <p className="muted mt-8">{expiringMsg}</p>
      </div>
    </section>
  );
}
