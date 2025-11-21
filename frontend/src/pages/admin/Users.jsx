import { useEffect, useState } from "react";
import { api } from "@/api";

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ email:"", dni:"", first_name:"", last_name:"", dob:"" });

  // asociar póliza
  const [assocOpen, setAssocOpen] = useState(false);
  const [assocTarget, setAssocTarget] = useState(null);
  const [availablePolicies, setAvailablePolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");

  async function fetchUsers() {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get("/admin/users");
      setRows(data || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudieron cargar los usuarios.");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchUsers(); }, []);

  function openCreate() {
    setEditing(null);
    setDraft({ email:"", dni:"", first_name:"", last_name:"", dob:"" });
    setDrawerOpen(true);
  }
  function openEdit(row) {
    setEditing(row);
    setDraft({
      email: row.email || "",
      dni: row.dni || "",
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      dob: row.dob || "",
    });
    setDrawerOpen(true);
  }

  async function onSave(e) {
    e.preventDefault();
    try {
      if (editing) await api.patch(`/admin/users/${editing.id}`, draft);
      else await api.post("/admin/users", draft);
      setDrawerOpen(false); setEditing(null);
      await fetchUsers();
    } catch (e2) {
      alert(e2?.response?.data?.detail || "No se pudo guardar el usuario.");
    }
  }

  async function onDelete(row) {
    if (!confirm(`¿Eliminar el usuario ${row.email}?`)) return;
    try {
      await api.delete(`/admin/users/${row.id}`);
      await fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
    }
  }

  async function openAssociate(row) {
    setAssocTarget(row);
    setSelectedPolicy("");
    setAssocOpen(true);
    // cargar pólizas sin usuario
    const { data } = await api.get("/admin/policies", { params: { only_unassigned: 1, page: 1, page_size: 100 } });
    setAvailablePolicies(data?.results || data || []);
  }

  async function confirmAssociate() {
    if (!selectedPolicy) return;
    try {
      await api.patch(`/admin/policies/${selectedPolicy}`, { user_id: assocTarget.id });
      setAssocOpen(false); setAssocTarget(null);
      alert("Póliza asociada.");
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo asociar la póliza.");
    }
  }

  return (
    <section className="section container">
      <header className="admin__head">
        <div>
          <h1>Usuarios</h1>
          <p className="muted">Crear, editar, eliminar y asociar pólizas a clientes.</p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>Nuevo usuario</button>
      </header>

      {err && <div className="register-alert">{err}</div>}

      <div className="card-like">
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th>Email</th><th>DNI</th><th>Nombre</th><th>Fecha nac.</th><th style={{width:260}}>Acciones</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}>Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5}>Sin resultados.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{r.dni || "—"}</td>
                  <td>{`${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"}</td>
                  <td>{r.dob || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn--outline" onClick={() => openAssociate(r)}>Asociar póliza</button>
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

      {/* Drawer crear/editar */}
      {drawerOpen && (
        <div className="drawer">
          <div className="drawer__panel" style={{maxWidth:520}}>
            <div className="drawer__head">
              <h2>{editing ? "Editar usuario" : "Nuevo usuario"}</h2>
              <button className="btn btn--outline" onClick={()=>setDrawerOpen(false)}>Cerrar</button>
            </div>
            <form className="form" onSubmit={onSave}>
              <div className="grid">
                <div className="field"><label>Email</label><input type="email" value={draft.email} onChange={(e)=>setDraft(d=>({...d,email:e.target.value}))} required/></div>
                <div className="field"><label>DNI</label><input value={draft.dni} onChange={(e)=>setDraft(d=>({...d,dni:e.target.value}))}/></div>
                <div className="field"><label>Nombre</label><input value={draft.first_name} onChange={(e)=>setDraft(d=>({...d,first_name:e.target.value}))}/></div>
                <div className="field"><label>Apellido</label><input value={draft.last_name} onChange={(e)=>setDraft(d=>({...d,last_name:e.target.value}))}/></div>
                <div className="field"><label>Fecha de nacimiento</label><input type="date" value={draft.dob} onChange={(e)=>setDraft(d=>({...d,dob:e.target.value}))}/></div>
              </div>
              <div className="actions">
                <button className="btn btn--primary" type="submit">Guardar</button>
                <button className="btn btn--outline" type="button" onClick={()=>setDrawerOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
          <div className="drawer__scrim" onClick={()=>setDrawerOpen(false)}/>
        </div>
      )}

      {/* Modal asociar póliza */}
      {assocOpen && (
        <div className="drawer">
          <div className="drawer__panel" style={{maxWidth:520}}>
            <div className="drawer__head">
              <h2>Asociar póliza a {assocTarget?.email}</h2>
              <button className="btn btn--outline" onClick={()=>setAssocOpen(false)}>Cerrar</button>
            </div>
            <div className="form">
              <div className="field">
                <label>Póliza sin usuario</label>
                <select value={selectedPolicy} onChange={(e)=>setSelectedPolicy(e.target.value)}>
                  <option value="">Elegí una póliza</option>
                  {availablePolicies.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.number || `#${p.id}`} — {p.vehicle?.plate || "sin patente"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="actions">
                <button className="btn btn--primary" onClick={confirmAssociate} disabled={!selectedPolicy}>Asociar</button>
                <button className="btn btn--outline" onClick={()=>setAssocOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
          <div className="drawer__scrim" onClick={()=>setAssocOpen(false)}/>
        </div>
      )}
    </section>
  );
}
