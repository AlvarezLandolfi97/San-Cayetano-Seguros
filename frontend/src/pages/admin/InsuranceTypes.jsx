import { useEffect, useState } from "react";
import { api } from "@/api";

export default function InsuranceTypes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [compact, setCompact] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [inlineDraft, setInlineDraft] = useState(null);
  const [inlineSaving, setInlineSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [draft, setDraft] = useState({ name: "", subtitle: "" });

  async function fetchAll() {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get("/admin/insurance-types");
      setRows(data || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudieron cargar los seguros.");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const handler = (e) => setCompact(e.matches);
    handler(mq);
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setDraft({ name: "", subtitle: "" });
    setFormOpen(true);
  }
  function openEdit(row) {
    setEditing(row);
    setDraft({ name: row.name || "", subtitle: row.subtitle || "" });
    setFormOpen(true);
  }

  async function onSave(e) {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/admin/insurance-types/${editing.id}`, {
          name: draft.name, subtitle: draft.subtitle,
        });
      } else {
        await api.post("/admin/insurance-types", {
          name: draft.name, subtitle: draft.subtitle, is_active: true,
        });
      }
      setFormOpen(false); setEditing(null);
      await fetchAll();
    } catch (e2) {
      alert(e2?.response?.data?.detail || "No se pudo guardar.");
    }
  }

  async function onDeleteInside() {
    if (!editing?.id) return;
    const ok = window.confirm(`¿Eliminar el seguro "${editing.name}"?`);
    if (!ok) return;
    try {
      await api.delete(`/admin/insurance-types/${editing.id}`);
      setFormOpen(false); setEditing(null);
      await fetchAll();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
    }
  }

  function openInline(row) {
    if (expandedId === row.id) {
      setExpandedId(null);
      setInlineDraft(null);
      return;
    }
    setExpandedId(row.id);
    setInlineDraft({ id: row.id, name: row.name || "", subtitle: row.subtitle || "" });
  }

  function updateInline(field, value) {
    setInlineDraft((d) => (d ? { ...d, [field]: value } : d));
  }

  async function saveInline() {
    if (!inlineDraft?.id) return;
    setInlineSaving(true);
    try {
      await api.patch(`/admin/insurance-types/${inlineDraft.id}`, {
        name: inlineDraft.name,
        subtitle: inlineDraft.subtitle,
      });
      await fetchAll();
      setExpandedId(null);
      setInlineDraft(null);
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo guardar.");
    } finally {
      setInlineSaving(false);
    }
  }

  async function deleteInline(row) {
    if (!row?.id) return;
    const ok = window.confirm(`¿Eliminar el seguro "${row.name || row.id}"?`);
    if (!ok) return;
    setInlineSaving(true);
    try {
      await api.delete(`/admin/insurance-types/${row.id}`);
      await fetchAll();
      if (expandedId === row.id) {
        setExpandedId(null);
        setInlineDraft(null);
      }
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
    } finally {
      setInlineSaving(false);
    }
  }

  return (
    <section className="section container policies-page">
      <header className="admin__head">
        <div>
          <h1>Seguros</h1>
        </div>
        <div className="ml-auto align-self-center">
          <button className="btn btn--primary" onClick={openCreate}>Nuevo seguro</button>
        </div>
      </header>

      {err && <div className="register-alert mt-8">{err}</div>}

      <div className="card-like">
        {compact ? (
          <div className="compact-list">
            {loading ? (
              <p className="muted">Cargando…</p>
            ) : rows.length === 0 ? (
              <p className="muted">Sin resultados.</p>
            ) : (
              rows.map((r) => {
                const isExpanded = expandedId === r.id;
                const draft = isExpanded ? inlineDraft || { id: r.id, name: r.name || "", subtitle: r.subtitle || "" } : null;
                return (
                  <div className="compact-item" key={r.id}>
                    <div className="compact-main">
                      <div className="compact-text">
                        <div className="compact-title-row">
                          <p className="compact-title">{r.name}</p>
                        </div>
                      </div>
                      <button className="compact-toggle" onClick={() => openInline(r)} aria-label="Ver detalle">
                        {isExpanded ? "–" : "+"}
                      </button>
                    </div>
                    {isExpanded && draft && (
                      <div className="compact-details">
                        <div className="detail-row">
                          <div className="detail-label">Nombre</div>
                          <input
                            className="detail-input"
                            value={draft.name}
                            onChange={(e) => updateInline("name", e.target.value)}
                          />
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Descripción</div>
                          <textarea
                            className="detail-input"
                            rows={3}
                            value={draft.subtitle}
                            onChange={(e) => updateInline("subtitle", e.target.value)}
                          />
                        </div>
                        <div className="compact-actions-inline">
                          <button className="btn btn--danger" onClick={() => deleteInline(r)} disabled={inlineSaving}>
                            Eliminar
                          </button>
                          <button className="btn btn--primary" onClick={saveInline} disabled={inlineSaving}>
                            {inlineSaving ? "Guardando…" : "Guardar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table policies-table">
              <thead><tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th className="col-narrow"></th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3}>Cargando…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={3}>Sin resultados.</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.subtitle || "—"}</td>
                    <td>
                      <button className="btn btn--outline" onClick={() => openEdit(r)}>Gestionar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="drawer drawer--modal">
          <div className="drawer__panel manage-modal">
            <div className="drawer__head">
              <h2>{editing ? `Gestionar seguro ${editing.name || ""}` : "Nuevo seguro"}</h2>
              <button className="drawer__close" onClick={() => setFormOpen(false)} aria-label="Cerrar">&times;</button>
            </div>

            <form className="detail-list" onSubmit={onSave}>
              <div className="detail-row">
                <div className="detail-label">Nombre</div>
                <div className="detail-value">
                  <input
                    className="detail-input"
                    value={draft.name}
                    onChange={(e)=>setDraft(d=>({...d,name:e.target.value}))}
                    required
                  />
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Descripción</div>
                <div className="detail-value">
                  <textarea
                    className="detail-input"
                    rows={3}
                    value={draft.subtitle}
                    onChange={(e)=>setDraft(d=>({...d,subtitle:e.target.value}))}
                  />
                </div>
              </div>
              <div className="actions actions--end">
                {editing?.id && (
                  <button className="btn btn--danger" type="button" onClick={onDeleteInside}>Eliminar</button>
                )}
                <button className="btn btn--primary" type="submit">Guardar</button>
              </div>
            </form>
          </div>
          <div className="drawer__scrim" onClick={()=>setFormOpen(false)} />
        </div>
      )}
    </section>
  );
}
