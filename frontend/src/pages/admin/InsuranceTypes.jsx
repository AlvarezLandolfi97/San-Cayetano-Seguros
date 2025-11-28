import { useEffect, useState } from "react";
import { api } from "@/api";

export default function InsuranceTypes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

  async function onDelete(row) {
    if (!confirm(`¿Eliminar el seguro "${row.name}"?`)) return;
    try {
      await api.delete(`/admin/insurance-types/${row.id}`);
      await fetchAll();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
    }
  }

  return (
    <section className="section container">
      <header className="admin__head">
        <div>
          <h1>Seguros</h1>
          <p className="muted">Creá, editá o eliminá los tipos de seguro ofrecidos.</p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn--primary" onClick={openCreate}>Nuevo seguro</button>
        </div>
      </header>

      {err && <div className="register-alert">{err}</div>}

      <div className="card-like">
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th style={{width:80}}>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{width:180}}>Acciones</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4}>Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4}>Sin resultados.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.name}</td>
                  <td>{r.subtitle || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn--outline" onClick={() => openEdit(r)}>Editar</button>
                      <button className="btn btn--outline" onClick={() => onDelete(r)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <div className="drawer">
          <div className="drawer__panel" style={{maxWidth:520}}>
            <div className="drawer__head">
              <h2>{editing ? "Editar seguro" : "Nuevo seguro"}</h2>
              <button className="btn btn--outline" onClick={() => setFormOpen(false)}>Cerrar</button>
            </div>

            <form className="form" onSubmit={onSave}>
              <div className="field">
                <label>Nombre</label>
                <input value={draft.name} onChange={(e)=>setDraft(d=>({...d,name:e.target.value}))} required />
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea rows={3} value={draft.subtitle} onChange={(e)=>setDraft(d=>({...d,subtitle:e.target.value}))}/>
              </div>
              <div className="actions">
                <button className="btn btn--primary" type="submit">Guardar</button>
                <button className="btn btn--outline" type="button" onClick={()=>setFormOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
          <div className="drawer__scrim" onClick={()=>setFormOpen(false)} />
        </div>
      )}
    </section>
  );
}
