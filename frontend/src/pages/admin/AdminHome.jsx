import { useEffect, useRef, useState } from "react";
import { api } from "@/api";
import useAuth from "@/hooks/useAuth";
import LogoutButton from "@/components/auth/LogoutButton";
import { daysUntil, isPolicyExpiringAfterWindow } from "./policyHelpers";

export default function AdminHome() {
  const { user, setSession } = useAuth();
  const [profile, setProfile] = useState({ email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [paymentWindow, setPaymentWindow] = useState(5);
  const [priceUpdateOffset, setPriceUpdateOffset] = useState(2);
  const [defaultTerm, setDefaultTerm] = useState(3);
  const [dueDayDisplay, setDueDayDisplay] = useState(5);
  const [expiringThresholdDays, setExpiringThresholdDays] = useState(30);
  const [expiringCount, setExpiringCount] = useState(0);
  const [priceUpdateCount, setPriceUpdateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasPolicies, setHasPolicies] = useState(false);
  const [err, setErr] = useState("");
  const isMounted = useRef(false);
  const showExpiringAlert = expiringCount > 0 && !loading && hasPolicies;
  const showPriceUpdateAlert = priceUpdateCount > 0 && !loading;

  useEffect(() => {
    if (user) {
      setProfile({
        email: user.email || "",
      });
    }
  }, [user]);

  useEffect(() => {
    isMounted.current = true;
    loadHomeData();
    return () => {
      isMounted.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAllPolicies() {
    const pageSize = 100;
    let page = 1;
    const accumulated = [];
    while (true) {
      const { data } = await api.get("/admin/policies", {
        params: { page, page_size: pageSize },
      });
      const list = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];
      if (!list.length) break;
      accumulated.push(...list);
      if (!data?.next) break;
      page += 1;
    }
    return accumulated;
  }

  async function loadHomeData() {
    setErr("");
    setLoading(true);
    try {
      const { data } = await api.get("/admin/settings");
      const payWindowValue = Number(data?.payment_window_days);
      const priceOffsetValue = Number(data?.price_update_offset_days);
      const displayValue = Number(data?.payment_due_day_display);
      const thresholdValue = Number(data?.expiring_threshold_days);
      const termValue = Number(
        data?.price_update_every_months != null ? data.price_update_every_months : data?.default_term_months
      );

      const windowForCounts = Number.isFinite(payWindowValue) && payWindowValue >= 0 ? payWindowValue : DEFAULT_PAYMENT_WINDOW;
      const dueDayForCounts = Number.isFinite(displayValue) && displayValue > 0 ? displayValue : DEFAULT_DUE_DAY;
      const thresholdForCounts = Number.isFinite(thresholdValue) && thresholdValue > 0 ? thresholdValue : DEFAULT_THRESHOLD;
      if (!isMounted.current) return;

      if (Number.isFinite(payWindowValue) && payWindowValue >= 0) setPaymentWindow(payWindowValue);
      if (Number.isFinite(priceOffsetValue) && priceOffsetValue >= 0) setPriceUpdateOffset(priceOffsetValue);
      if (Number.isFinite(displayValue) && displayValue > 0) setDueDayDisplay(displayValue);
      if (Number.isFinite(thresholdValue) && thresholdValue > 0) setExpiringThresholdDays(thresholdValue);
      if (Number.isFinite(termValue) && termValue > 0) setDefaultTerm(termValue);

      const list = await fetchAllPolicies();
      if (!isMounted.current) return;
      setHasPolicies(list.length > 0);
      const count = list.filter((p) =>
        isPolicyExpiringAfterWindow(p, windowForCounts, dueDayForCounts, thresholdForCounts)
      ).length;
      setExpiringCount(count);
      const priceToUpdate = list.filter((p) => {
        const startDiff = daysUntil(p.price_update_from);
        const endDiff = daysUntil(p.price_update_to);
        const inWindow =
          Number.isFinite(startDiff) && startDiff <= 0 && (!Number.isFinite(endDiff) || endDiff >= 0);
        const stillActive = daysUntil(p.client_end_date || p.end_date) >= 0;
        return p.status === "active" && inWindow && stillActive;
      }).length;
      setPriceUpdateCount(priceToUpdate);
    } catch (e) {
      if (!isMounted.current) return;
      setErr(e?.response?.data?.detail || "No se pudo cargar la información.");
      setExpiringCount(0);
      setPriceUpdateCount(0);
      setHasPolicies(false);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }

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
        payment_window_days: paymentWindow,
        payment_due_day_display: dueDayDisplay,
        expiring_threshold_days: expiringThresholdDays,
        price_update_offset_days: priceUpdateOffset,
        price_update_every_months: defaultTerm, // frecuencia de ajuste
        default_term_months: defaultTerm, // mantenemos sincronizado con la vigencia por defecto
      });
      await loadHomeData();
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
            <span className="muted">Día visible de vencimiento</span>
            <select
              value={dueDayDisplay}
              onChange={(e) => setDueDayDisplay(Number(e.target.value))}
              disabled={savingThreshold}
            >
              {Array.from({ length: 31 }, (_, idx) => idx + 1).map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            <span className="muted">que le mostramos al cliente.</span>
          </div>
          <div className="admin-home__prefs-row">
            <span className="muted">Días para considerar próxima a vencer</span>
            <select
              value={expiringThresholdDays}
              onChange={(e) => setExpiringThresholdDays(Number(e.target.value))}
              disabled={savingThreshold}
            >
              {[3,5,7,10,14,21,30].map((n) => (
                <option key={n} value={n}>{n} días</option>
              ))}
            </select>
            <span className="muted">desde el vencimiento real.</span>
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
