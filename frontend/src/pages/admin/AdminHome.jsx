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
  const [profile, setProfile] = useState({ first_name: "", last_name: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [threshold, setThreshold] = useState(7);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [expiringCount, setExpiringCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
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
    setSavingProfile(true);
    setErr("");
    try {
      const { data } = await api.patch(`/admin/users/${user.id}`, {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
      });
      setSession({ user: data ? { ...user, ...data } : user });
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
    if (expiringCount > 0) return `${expiringCount} póliza(s) próximas a vencer`;
    return "Sin pólizas próximas a vencer";
  }, [expiringCount, loading]);

  return (
    <section className="section container">
      <header className="admin__head">
        <div>
          <h1>Inicio admin</h1>
          <p className="muted">Editá tus datos y preferencias del panel.</p>
        </div>
      </header>

      {err && <div className="register-alert" style={{ marginBottom: 10 }}>{err}</div>}

      <div className="card-like" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Tus datos</h3>
        <form className="form" onSubmit={saveProfile}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="field">
              <label>Nombre</label>
              <input value={profile.first_name} onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Apellido</label>
              <input value={profile.last_name} onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} required />
            </div>
          </div>
          <div className="actions">
            <button className="btn btn--primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "Guardando…" : "Guardar datos"}
            </button>
          </div>
        </form>
      </div>

      <div className="card-like" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Preferencias</h3>
        <div className="filters" style={{ alignItems: "center", gap: 12 }}>
          <label className="muted">Avisar (y destacar) cuando falten</label>
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
          <button className="btn btn--primary" onClick={savePrefs} disabled={savingThreshold}>Guardar preferencia</button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>{expiringMsg}</p>
      </div>
    </section>
  );
}
