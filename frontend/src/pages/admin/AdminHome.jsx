import { useEffect, useState } from "react";
import { api } from "@/api";
import useAuth from "@/hooks/useAuth";
import LogoutButton from "@/components/auth/LogoutButton";

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const end = new Date(dateStr + "T00:00:00");
  const today = new Date();
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = end - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function deriveStatus(status, endDate) {
  const d = daysUntil(endDate);
  if (["cancelled", "inactive", "suspended"].includes(status)) return status;
  if (d < 0) return "expired";
  if (status === "expired") return "active";
  return status || "active";
}

export default function AdminHome() {
  const { user, setSession } = useAuth();
  const [profile, setProfile] = useState({ email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [clientOffset, setClientOffset] = useState(2);
  const [paymentWindow, setPaymentWindow] = useState(5);
  const [priceUpdateOffset, setPriceUpdateOffset] = useState(2);
  const [defaultTerm, setDefaultTerm] = useState(3);
  const [expiringCount, setExpiringCount] = useState(0);
  const [priceUpdateCount, setPriceUpdateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const showExpiringAlert = expiringCount > 0 && !loading;
  const showPriceUpdateAlert = priceUpdateCount > 0 && !loading;

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
        // settings
        try {
          const { data } = await api.get("/admin/settings");
          const offset = Number(data?.client_expiration_offset_days);
          if (Number.isFinite(offset) && offset >= 0) setClientOffset(offset);
          const payWindow = Number(data?.payment_window_days);
          if (Number.isFinite(payWindow) && payWindow >= 0) setPaymentWindow(payWindow);
          const priceOffset = Number(data?.price_update_offset_days);
          if (Number.isFinite(priceOffset) && priceOffset >= 0) setPriceUpdateOffset(priceOffset);
          const term = Number(data?.default_term_months);
          if (Number.isFinite(term) && term > 0) setDefaultTerm(term);
        } catch {
          /* silent */
        }

        // expiring
        try {
          const { data } = await api.get("/admin/policies");
          const arr = (Array.isArray(data?.results) ? data.results : data) || [];
          const count = arr.filter((p) => {
            const realEndDiff = daysUntil(p.real_end_date || p.end_date);
            const clientDiff = daysUntil(p.client_end_date || p.end_date);
            const statusDerived = deriveStatus(p.status, p.real_end_date || p.end_date);
            // Mostrar como próximo a vencer si ya pasó el vencimiento adelantado pero aún no llega el real.
            return statusDerived === "active" && clientDiff < 0 && realEndDiff >= 0;
          }).length;
          setExpiringCount(count);
          const priceToUpdate = arr.filter((p) => {
            const startDiff = daysUntil(p.price_update_from);
            const endDiff = daysUntil(p.price_update_to);
            const inWindow = Number.isFinite(startDiff) && startDiff <= 0 && (!Number.isFinite(endDiff) || endDiff >= 0);
            const stillActive = daysUntil(p.client_end_date || p.end_date) >= 0;
            return p.status === "active" && inWindow && stillActive;
          }).length;
          setPriceUpdateCount(priceToUpdate);
        } catch {
          setExpiringCount(0);
          setPriceUpdateCount(0);
        }
      } catch (e) {
        setErr(e?.response?.data?.detail || "No se pudo cargar la información.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      await api.patch("/admin/settings", {
        client_expiration_offset_days: clientOffset,
        payment_window_days: paymentWindow,
        price_update_offset_days: priceUpdateOffset,
        price_update_every_months: defaultTerm,
        default_term_months: defaultTerm,
      });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "No se pudo guardar las preferencias.");
    } finally {
      setSavingThreshold(false);
    }
  }

  return (
    <section className="section container policies-page">
      <header className="admin__head">
        <div>
          <h1>Inicio admin</h1>
        </div>
        <div className="admin__head-actions">
          <LogoutButton className="btn btn--primary" />
        </div>
      </header>

      {showExpiringAlert && (
        <div className="alert-bar alert-bar--danger">
          Hay {expiringCount} póliza(s) próximas a vencer.
        </div>
      )}
      {showPriceUpdateAlert && (
        <div className="alert-bar alert-bar--warning">
          Hay {priceUpdateCount} póliza(s) listas para ajustar precio.
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
            <span className="muted">Mostrar al cliente como vencida</span>
            <select
              value={clientOffset}
              onChange={(e) => setClientOffset(Number(e.target.value))}
              disabled={savingThreshold}
            >
              {[0,1,2,3,5,7].map((n) => (
                <option key={n} value={n}>{n} día{n === 1 ? "" : "s"} antes</option>
              ))}
            </select>
            <span className="muted">del vencimiento real.</span>
          </div>
          <div className="admin-home__prefs-row">
            <span className="muted">Duración del periodo de pago</span>
            <select
              value={paymentWindow}
              onChange={(e) => setPaymentWindow(Number(e.target.value))}
              disabled={savingThreshold}
            >
              {[0,3,5,7,10,15].map((n) => (
                <option key={n} value={n}>{n} día{n === 1 ? "" : "s"}</option>
              ))}
            </select>
            <span className="muted">de ventana para pagar.</span>
          </div>
          <div className="admin-home__prefs-row">
            <span className="muted">Avisar para ajustar precio</span>
            <select
              value={priceUpdateOffset}
              onChange={(e) => setPriceUpdateOffset(Number(e.target.value))}
              disabled={savingThreshold}
            >
              {[0,1,2,3,5,7].map((n) => (
                <option key={n} value={n}>{n} día{n === 1 ? "" : "s"} antes del fin de periodo</option>
              ))}
            </select>
            <span className="muted">para aplicar nuevos montos.</span>
          </div>
          <div className="admin-home__prefs-row">
            <span className="muted">Duración de cada período</span>
            <select
              value={defaultTerm}
              onChange={(e) => setDefaultTerm(Number(e.target.value))}
              disabled={savingThreshold}
            >
              {[1,3,6,12].map((n) => (
                <option key={n} value={n}>{n} mes{n === 1 ? "" : "es"}</option>
              ))}
            </select>
            <span className="muted">define la frecuencia de ajuste.</span>
          </div>
          <div className="actions actions--end admin-home__prefs-actions">
            <button className="btn btn--primary" onClick={savePrefs} disabled={savingThreshold}>Guardar preferencia</button>
          </div>
        </div>
      </div>
    </section>
  );
}
