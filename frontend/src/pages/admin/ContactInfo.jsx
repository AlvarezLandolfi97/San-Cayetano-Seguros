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
      const { data } = await api.get("/api/common/contact-info/");
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
      await api.patch("/api/common/contact-info/", draft);
      setSavedMsg("Información actualizada correctamente.");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "No se pudo guardar. Reintentá en unos segundos.");
    } finally {
      setSaving(false);
    }
  }

  const mapSrc = draft.map_embed_url || "";

  return (
    <section className="section container">
      <header className="admin__head">
        <div>
          <h1>Contacto</h1>
          <p className="muted">Editá los datos que se muestran en la sección de contacto del Home.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn--subtle" type="button" onClick={loadData} disabled={loading || saving}>
            Recargar
          </button>
          <button className="btn btn--primary" type="submit" form="contact-form" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </header>

      {err && <div className="register-alert" style={{ marginBottom: 12 }}>{err}</div>}
      {savedMsg && <div className="register-alert" style={{ borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534" }}>{savedMsg}</div>}

      <div className="card-like">
        <form className="form" id="contact-form" onSubmit={onSave}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
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

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Horario de atención</label>
              <input
                value={draft.schedule}
                onChange={(e) => setDraft((d) => ({ ...d, schedule: e.target.value }))}
                placeholder="Lun a Vie 9:00 a 18:00"
                required
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>URL de mapa (iframe src de Google Maps)</label>
              <textarea
                rows={3}
                value={draft.map_embed_url}
                onChange={(e) => setDraft((d) => ({ ...d, map_embed_url: e.target.value }))}
                placeholder="https://www.google.com/maps/embed?pb=..."
              />
              <small className="muted">Pega solo el valor del atributo <code>src</code> del iframe.</small>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Vista previa del mapa</label>
              <div style={{ border: "1px solid #e6ecf5", borderRadius: 10, overflow: "hidden", minHeight: 220, background: "#f8fbff" }}>
                {mapSrc ? (
                  <iframe
                    title="Vista previa mapa"
                    src={mapSrc}
                    style={{ width: "100%", height: 260, border: "0" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div style={{ padding: 16, color: "#6b7280" }}>
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
