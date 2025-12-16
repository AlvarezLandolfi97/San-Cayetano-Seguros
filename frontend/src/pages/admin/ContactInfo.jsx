import { useEffect, useState } from "react";
import { api } from "@/api";

const EMPTY = {
  whatsapp: "",
  email: "",
  address: "",
  map_embed_url: "",
  schedule: "",
};

export default function ContactInfoAdmin() {
  const [draft, setDraft] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  async function loadData() {
    setLoading(true);
    setErr("");
    setSavedMsg("");
    try {
      // El baseURL ya incluye /api
      const { data } = await api.get("/common/contact-info/");
      setDraft({ ...EMPTY, ...(data || {}) });
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudo cargar la información de contacto.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setSavedMsg("");
    try {
      await api.patch("/common/contact-info/", draft);
      setSavedMsg("Información actualizada correctamente.");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "No se pudo guardar. Reintentá en unos segundos.");
    } finally {
      setSaving(false);
    }
  }

  const mapSrc = draft.map_embed_url || "";

  return (
    <section className="section container policies-page">
      <header className="admin__head">
        <div>
          <h1>Contacto</h1>
        </div>
        <button className="btn btn--primary align-self-center" type="submit" form="contact-form" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </header>

      {err && <div className="register-alert mt-8">{err}</div>}
      {savedMsg && <div className="register-alert alert--success">{savedMsg}</div>}

      <div className="card-like">
        <form className="form" id="contact-form" onSubmit={onSave}>
          <div className="grid admin-grid--auto-240">
            <div className="field">
              <label>WhatsApp</label>
              <input
                value={draft.whatsapp}
                onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))}
                placeholder="+54 9 ..."
                required
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="contacto@tuempresa.com"
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Dirección</label>
            <input
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder="Av. Ejemplo 1234, Ciudad"
              required
            />
          </div>

          <div className="grid admin-grid--two">
            <div className="field grid-span-full">
              <label>Horario de atención</label>
              <input
                value={draft.schedule}
                onChange={(e) => setDraft((d) => ({ ...d, schedule: e.target.value }))}
                placeholder="Lun a Vie 9:00 a 18:00"
                required
              />
            </div>

            <div className="field grid-span-full">
              <label>URL de mapa (iframe src de Google Maps)</label>
              <textarea
                rows={3}
                value={draft.map_embed_url}
                onChange={(e) => setDraft((d) => ({ ...d, map_embed_url: e.target.value }))}
                placeholder="https://www.google.com/maps/embed?pb=..."
              />
              <small className="muted">Pega solo el valor del atributo <code>src</code> del iframe.</small>
            </div>

            <div className="field grid-span-full">
              <label>Vista previa del mapa</label>
              <div className="contact-map">
                {mapSrc ? (
                  <iframe
                    title="Vista previa mapa"
                    src={mapSrc}
                    className="contact-map__iframe"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="contact-map__placeholder">
                    Ingresá un iframe src de Google Maps para previsualizarlo.
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
