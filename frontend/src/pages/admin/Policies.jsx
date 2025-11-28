import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const end = new Date(dateStr + "T00:00:00");
  const today = new Date();
  // Normalizamos horas para evitar desfasajes
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = end - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function Policies() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [compact, setCompact] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // combos
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  // búsqueda simple
  const [q, setQ] = useState("");

  // drawer crear/editar
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // modal rápido para cuota
  const [premiumEdit, setPremiumEdit] = useState({ open: false, id: null, value: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [inlineDraft, setInlineDraft] = useState(null);
  const [inlineSaving, setInlineSaving] = useState(false);

  // preferencias admin (umbral “próximo a vencer”)
  const [threshold, setThreshold] = useState(7);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // ------- data -------
  async function fetchPolicies() {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/admin/policies");
      const arr = (Array.isArray(data?.results) ? data.results : data) || [];
      const norm = arr.map((p) => ({
        ...p,
        user: p.user || (p.user_id ? { id: p.user_id } : null),
        product: p.product || (p.product_id ? { id: p.product_id } : null),
        vehicle: p.vehicle || {},
      }));
      setRows(norm);
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudieron cargar las pólizas.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data || []);
    } catch {
      setUsers([]);
    }
  }

  async function fetchProducts() {
    try {
      const { data } = await api.get("/admin/insurance-types");
      setProducts(data || []);
    } catch {
      setProducts([]);
    }
  }

  async function fetchSettings() {
    try {
      const { data } = await api.get("/admin/settings");
      const n = Number(data?.expiring_threshold_days);
      if (Number.isFinite(n) && n > 0) setThreshold(n);
    } catch {
      // default 7
    }
  }

  useEffect(() => {
    fetchPolicies();
    fetchUsers();
    fetchProducts();
    fetchSettings();
    const mq = window.matchMedia("(max-width: 900px)");
    const handler = (e) => setCompact(e.matches);
    handler(mq);
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
    };
  }, []);

  // ------- helpers visuales -------
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const fullName = [r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ");
      const parts = [
        r.number,
        r.vehicle?.plate,
        r.user?.email,
        r.user?.first_name,
        r.user?.last_name,
        fullName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return parts.includes(term);
    });
  }, [rows, q]);

  const { expiring, others } = useMemo(() => {
    const exp = [];
    const rest = [];
    for (const p of filtered) {
      const d = daysUntil(p.end_date);
      // Consideramos “próximo a vencer” solo si está activa y el vencimiento es >= 0
      if (p.status === "active" && d >= 0 && d <= threshold) exp.push({ ...p, __daysLeft: d });
      else rest.push(p);
    }
    // ordenamos las próximas a vencer por días restantes ascendente
    exp.sort((a, b) => (a.__daysLeft ?? 9999) - (b.__daysLeft ?? 9999));
    // para la tabla general, también subimos las expiring y después el resto,
    // pero conservando un orden por fecha de fin ascendente
    rest.sort((a, b) => {
      const da = new Date((a.end_date || "9999-12-31") + "T00:00:00");
      const db = new Date((b.end_date || "9999-12-31") + "T00:00:00");
      return da - db;
    });
    return { expiring: exp, others: rest };
  }, [filtered, threshold]);

  const tableRows = useMemo(() => [...expiring, ...others], [expiring, others]);
  const displayUser = (r) =>
    r.user
      ? `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() || r.user.email || r.user.id
      : r.user_id || "—";
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((tableRows.length || 1) / PAGE_SIZE)),
    [tableRows.length]
  );
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tableRows.slice(start, start + PAGE_SIZE);
  }, [tableRows, page]);

  useEffect(() => {
    setPage(1);
  }, [tableRows.length]);

  const draftFromRow = (row) => ({
    id: row.id,
    number: row.number || "",
    status: row.status || "active",
    start_date: row.start_date || "",
    end_date: row.end_date || "",
    premium: row.premium ?? "",
    vehicle: {
      plate: row.vehicle?.plate || "",
      make: row.vehicle?.make || "",
      model: row.vehicle?.model || "",
      version: row.vehicle?.version || "",
      year: row.vehicle?.year || "",
      city: row.vehicle?.city || "",
    },
  });

  function openDetail(row) {
    if (expandedId === row.id) {
      setExpandedId(null);
      setInlineDraft(null);
      return;
    }
    setExpandedId(row.id);
    setInlineDraft(draftFromRow(row));
  }

  // ------- CRUD -------
  function openCreate() {
    setEditing({
      id: null,
      number: "",
      product_id: "",
      user_id: null,
      status: "active",
      start_date: "",
      end_date: "",
      premium: "",
      vehicle: {
        plate: "",
        make: "",
        model: "",
        version: "",
        year: "",
        city: "",
      },
    });
    setDrawerOpen(true);
  }

  function openEdit(row) {
    setEditing({
      id: row.id,
      number: row.number || "",
      product_id: row.product?.id || row.product_id || "",
      user_id: row.user?.id ?? row.user_id ?? null,
      status: row.status || "active",
      start_date: row.start_date || "",
      end_date: row.end_date || "",
      premium: row.premium ?? "",
      vehicle: {
        plate: row.vehicle?.plate || "",
        make: row.vehicle?.make || "",
        model: row.vehicle?.model || "",
        version: row.vehicle?.version || "",
        year: row.vehicle?.year || "",
        city: row.vehicle?.city || "",
      },
    });
    setDrawerOpen(true);
  }

  async function onSave(e) {
    e.preventDefault();
    const payload = {
      number: editing.number || null,
      product_id: editing.product_id || null,
      user_id: editing.user_id || null,
      status: editing.status || "active",
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
      premium: editing.premium === "" ? null : Number(editing.premium),
      vehicle: editing.vehicle,
    };
    try {
      if (editing.id) {
        await api.patch(`/admin/policies/${editing.id}`, payload);
      } else {
        await api.post(`/admin/policies`, payload);
      }
      setDrawerOpen(false);
      setEditing(null);
      await fetchPolicies();
    } catch (e2) {
      alert(e2?.response?.data?.detail || "No se pudo guardar la póliza.");
    }
  }

  async function onDelete(row) {
    if (!confirm(`¿Eliminar la póliza ${row.number || `#${row.id}`}?`)) return;
    try {
      await api.delete(`/admin/policies/${row.id}`);
      await fetchPolicies();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
    }
  }

  // ------- cuota rápida -------
  function openQuickPremium(row) {
    setPremiumEdit({
      open: true,
      id: row.id,
      value: String(row.premium ?? ""),
    });
  }

  function updateInlineDraft(field, value, nested = false) {
    setInlineDraft((d) => {
      if (!d) return d;
      if (nested) return { ...d, vehicle: { ...d.vehicle, [field]: value } };
      return { ...d, [field]: value };
    });
  }

  async function saveInline() {
    if (!inlineDraft?.id) return;
    setInlineSaving(true);
    try {
      const payload = {
        number: inlineDraft.number || null,
        status: inlineDraft.status || "active",
        start_date: inlineDraft.start_date || null,
        end_date: inlineDraft.end_date || null,
        premium: inlineDraft.premium === "" ? null : Number(inlineDraft.premium),
        vehicle: inlineDraft.vehicle,
      };
      await api.patch(`/admin/policies/${inlineDraft.id}`, payload);
      await fetchPolicies();
      setExpandedId(null);
      setInlineDraft(null);
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo guardar los cambios.");
    } finally {
      setInlineSaving(false);
    }
  }

  async function saveQuickPremium() {
    const val = Number(premiumEdit.value);
    if (!Number.isFinite(val)) return alert("Ingresá un número válido para la cuota.");
    try {
      await api.patch(`/admin/policies/${premiumEdit.id}`, { premium: val });
      setPremiumEdit({ open: false, id: null, value: "" });
      await fetchPolicies();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo actualizar la cuota.");
    }
  }

  // ------- guardar preferencia de umbral -------
  async function saveThreshold(n) {
    setSavingThreshold(true);
    try {
      const { data } = await api.patch("/admin/settings", { expiring_threshold_days: n });
      const v = Number(data?.expiring_threshold_days);
      if (Number.isFinite(v) && v > 0) setThreshold(v);
    } finally {
      setSavingThreshold(false);
    }
  }

  // ------- view -------
  return (
    <section className="section container">
      <header className="admin__head">
        <div>
          <h1>Pólizas</h1>
        </div>
        <button
          className="btn btn--primary"
          style={{ marginLeft: "auto", alignSelf: "center" }}
          onClick={openCreate}
        >
          Nueva póliza
        </button>
      </header>

      {err && <div className="register-alert" style={{ marginTop: 8 }}>{err}</div>}

      {/* Sección destacada: Próximo a vencer */}
      {expiring.length > 0 && (
        <div className="card-like" style={{ borderColor: "#ffe6bf", background: "#fffaf2" }}>
          <h3 style={{ marginTop: 0 }}>Próximo a vencer</h3>
          {compact ? (
            <div className="compact-list">
              {expiring.map((r) => {
                const isExpanded = expandedId === r.id;
                const draft = isExpanded ? inlineDraft || draftFromRow(r) : null;
                return (
                  <div className="compact-item" key={`exp-${r.id}`}>
                    <div className="compact-main">
                      <div className="compact-text">
                        <div className="compact-title-row">
                          <p className="compact-title">{r.number || `#${r.id}`}</p>
                          <span className="badge" style={{ background: "#fff1ce", borderColor: "#ffd48a", color: "#7a3b00" }}>
                            {r.__daysLeft} día{r.__daysLeft === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="compact-sub">{r.vehicle?.plate || "—"} · {displayUser(r)}</p>
                      </div>
                      <button className="compact-toggle" onClick={() => openDetail(r)} aria-label="Ver detalle">
                        {isExpanded ? "–" : "+"}
                      </button>
                    </div>
                    {isExpanded && draft && (
                      <div className="compact-details">
                        <div className="detail-row">
                          <div className="detail-label">Seguro</div>
                          <div className="detail-value">{r.product?.name || "—"}</div>
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Usuario</div>
                          <div className="detail-value">{displayUser(r)}</div>
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Estado</div>
                          <select className="detail-input" value={draft.status} onChange={(e) => updateInlineDraft("status", e.target.value)}>
                            <option value="active">Activa</option>
                            <option value="suspended">Suspendida</option>
                            <option value="expired">Vencida</option>
                            <option value="cancelled">Cancelada</option>
                          </select>
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Vigencia</div>
                          <div className="detail-value detail-inline">
                            <input className="detail-input" type="date" value={draft.start_date} onChange={(e) => updateInlineDraft("start_date", e.target.value)} />
                            <span style={{ margin: "0 6px" }}>→</span>
                            <input className="detail-input" type="date" value={draft.end_date} onChange={(e) => updateInlineDraft("end_date", e.target.value)} />
                          </div>
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Cuota</div>
                          <input className="detail-input" value={draft.premium ?? ""} onChange={(e) => updateInlineDraft("premium", e.target.value)} />
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Vehículo</div>
                          <div className="detail-value detail-inline vehicle-grid">
                            <input className="detail-input" placeholder="Patente" value={draft.vehicle?.plate || ""} onChange={(e) => updateInlineDraft("plate", e.target.value, true)} />
                            <input className="detail-input" placeholder="Marca" value={draft.vehicle?.make || ""} onChange={(e) => updateInlineDraft("make", e.target.value, true)} />
                            <input className="detail-input" placeholder="Modelo" value={draft.vehicle?.model || ""} onChange={(e) => updateInlineDraft("model", e.target.value, true)} />
                            <input className="detail-input" placeholder="Versión" value={draft.vehicle?.version || ""} onChange={(e) => updateInlineDraft("version", e.target.value, true)} />
                            <input className="detail-input" placeholder="Año" value={draft.vehicle?.year || ""} onChange={(e) => updateInlineDraft("year", e.target.value, true)} />
                            <input className="detail-input" placeholder="Ciudad" value={draft.vehicle?.city || ""} onChange={(e) => updateInlineDraft("city", e.target.value, true)} />
                          </div>
                        </div>
                        <div className="compact-actions-inline">
                          <button className="btn btn--primary" onClick={saveInline} disabled={inlineSaving}>Guardar cambios</button>
                          <button className="btn btn--outline" onClick={() => onDelete(r)}>Eliminar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Seguro</th>
                    <th>Patente</th>
                    <th>Usuario</th>
                    <th>Vence en</th>
                    <th>Vigencia</th>
                    <th>Cuota</th>
                    <th style={{ width: 240 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((r) => (
                    <tr key={`exp-${r.id}`}>
                      <td>{r.number || `#${r.id}`}</td>
                      <td>{r.product?.name || "—"}</td>
                      <td>{r.vehicle?.plate || "—"}</td>
                      <td>{displayUser(r)}</td>
                      <td>
                        <span
                          style={{
                            background: "#fff1ce",
                            border: "1px solid #ffd48a",
                            color: "#7a3b00",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                          title={`Faltan ${r.__daysLeft} día(s)`}
                        >
                          {r.__daysLeft} día{r.__daysLeft === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="small">
                        {r.start_date || "—"} → {r.end_date || "—"}
                      </td>
                      <td>${r.premium ?? "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn--outline" onClick={() => openQuickPremium(r)}>
                            Modificar cuota
                          </button>
                          <button className="btn btn--outline" onClick={() => openEdit(r)}>Editar</button>
                          <button className="btn btn--outline" onClick={() => onDelete(r)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* Tabla general (expiring primero) */}
      <div className="card-like">
                <div className="pagination">
          <button className="btn btn--outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Anterior
          </button>
          <input
            className="admin__search"
            placeholder="Buscar por número de póliza, patente o cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn--outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>
            Siguiente
          </button>
        </div>
        <div className="pagination-info">
          <span className="muted">Página {page} de {pageCount}</span>
        </div>
        {compact ? (
          <div className="compact-list">
            {loading ? (
              <p className="muted">Cargando…</p>
            ) : tableRows.length === 0 ? (
              <p className="muted">Sin resultados.</p>
            ) : (
              paginatedRows.map((r) => {
                const isExpanded = expandedId === r.id;
                const draft = isExpanded ? inlineDraft || draftFromRow(r) : null;
                return (
                  <div className="compact-item" key={r.id}>
                    <div className="compact-main">
                      <div className="compact-text">
                        <div className="compact-title-row">
                          <p className="compact-title">{r.number || `#${r.id}`}</p>
                          <span className="badge">{r.status}</span>
                        </div>
                        <p className="compact-sub">{r.vehicle?.plate || "—"} · {displayUser(r)}</p>
                      </div>
                      <button className="compact-toggle" onClick={() => openDetail(r)} aria-label="Ver detalle">
                        {isExpanded ? "–" : "+"}
                      </button>
                    </div>
                    {isExpanded && draft && (
                      <div className="compact-details">
                        <div className="detail-row">
                          <div className="detail-label">Seguro</div>
                          <div className="detail-value">{r.product?.name || "—"}</div>
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Usuario</div>
                          <div className="detail-value">{displayUser(r)}</div>
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Estado</div>
                          <select className="detail-input" value={draft.status} onChange={(e) => updateInlineDraft("status", e.target.value)}>
                            <option value="active">Activa</option>
                            <option value="suspended">Suspendida</option>
                            <option value="expired">Vencida</option>
                            <option value="cancelled">Cancelada</option>
                          </select>
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Vigencia</div>
                          <div className="detail-value detail-inline">
                            <input className="detail-input" type="date" value={draft.start_date} onChange={(e) => updateInlineDraft("start_date", e.target.value)} />
                            <span style={{ margin: "0 6px" }}>→</span>
                            <input className="detail-input" type="date" value={draft.end_date} onChange={(e) => updateInlineDraft("end_date", e.target.value)} />
                          </div>
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Cuota</div>
                          <input className="detail-input" value={draft.premium ?? ""} onChange={(e) => updateInlineDraft("premium", e.target.value)} />
                        </div>
                        <div className="detail-row">
                          <div className="detail-label">Vehículo</div>
                          <div className="detail-value detail-inline vehicle-grid">
                            <input className="detail-input" placeholder="Patente" value={draft.vehicle?.plate || ""} onChange={(e) => updateInlineDraft("plate", e.target.value, true)} />
                            <input className="detail-input" placeholder="Marca" value={draft.vehicle?.make || ""} onChange={(e) => updateInlineDraft("make", e.target.value, true)} />
                            <input className="detail-input" placeholder="Modelo" value={draft.vehicle?.model || ""} onChange={(e) => updateInlineDraft("model", e.target.value, true)} />
                            <input className="detail-input" placeholder="Versión" value={draft.vehicle?.version || ""} onChange={(e) => updateInlineDraft("version", e.target.value, true)} />
                            <input className="detail-input" placeholder="Año" value={draft.vehicle?.year || ""} onChange={(e) => updateInlineDraft("year", e.target.value, true)} />
                            <input className="detail-input" placeholder="Ciudad" value={draft.vehicle?.city || ""} onChange={(e) => updateInlineDraft("city", e.target.value, true)} />
                          </div>
                        </div>
                        <div className="compact-actions-inline">
                          <button className="btn btn--primary" onClick={saveInline} disabled={inlineSaving}>Guardar cambios</button>
                          <button className="btn btn--outline" onClick={() => onDelete(r)}>Eliminar</button>
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
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Seguro</th>
                  <th>Patente</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Vigencia</th>
                  <th>Cuota</th>
                  <th style={{ width: 240 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}>Cargando…</td></tr>
                ) : tableRows.length === 0 ? (
                  <tr><td colSpan={8}>Sin resultados.</td></tr>
                ) : (
                  paginatedRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.number || `#${r.id}`}</td>
                      <td>{r.product?.name || "—"}</td>
                      <td>{r.vehicle?.plate || "—"}</td>
                      <td>{displayUser(r)}</td>
                      <td>{r.status}</td>
                      <td className="small">
                        {r.start_date || "—"} → {r.end_date || "—"}
                      </td>
                      <td>${r.premium ?? "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn--outline" onClick={() => openQuickPremium(r)}>
                            Modificar cuota
                          </button>
                          <button className="btn btn--outline" onClick={() => openEdit(r)}>Editar</button>
                          <button className="btn btn--outline" onClick={() => onDelete(r)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <button className="btn btn--outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Anterior
          </button>
          <span className="muted">Página {page} de {pageCount}</span>
          <button className="btn btn--outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>
            Siguiente
          </button>
        </div>
      </div>

      {/* Drawer crear/editar */}
      {drawerOpen && (
        <div className="drawer">
          <div className="drawer__panel">
            <div className="drawer__head">
              <h2>{editing?.id ? "Editar póliza" : "Nueva póliza"}</h2>
              <button
                className="btn btn--outline"
                onClick={() => { setDrawerOpen(false); setEditing(null); }}
              >
                Cerrar
              </button>
            </div>

            <form className="form" onSubmit={onSave}>
              <div className="grid">
                <div className="field">
                  <label>Número</label>
                  <input
                    value={editing.number}
                    onChange={(e) => setEditing((p) => ({ ...p, number: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Seguro</label>
                  <select
                    value={editing.product_id}
                    onChange={(e) => setEditing((p) => ({ ...p, product_id: e.target.value }))}
                    required
                  >
                    <option value="">Elegí un plan</option>
                    {products.map((pr) => (
                      <option key={pr.id} value={pr.id}>{pr.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Usuario (opcional)</label>
                  <select
                    value={editing.user_id ?? ""}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, user_id: e.target.value ? Number(e.target.value) : null }))
                    }
                  >
                    <option value="">— Sin usuario —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Estado</label>
                  <select
                    value={editing.status}
                    onChange={(e) => setEditing((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Activa</option>
                    <option value="suspended">Suspendida</option>
                    <option value="expired">Vencida</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>

                <div className="field">
                  <label>Inicio</label>
                  <input
                    type="date"
                    value={editing.start_date}
                    onChange={(e) => setEditing((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Fin</label>
                  <input
                    type="date"
                    value={editing.end_date}
                    onChange={(e) => setEditing((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Cuota mensual</label>
                  <input
                    inputMode="decimal"
                    value={editing.premium}
                    onChange={(e) => setEditing((p) => ({ ...p, premium: e.target.value }))}
                  />
                </div>
              </div>

              <div className="card-like">
                <h3 style={{ marginTop: 0 }}>Vehículo</h3>
                <div className="grid">
                  <div className="field">
                    <label>Patente</label>
                    <input
                      value={editing.vehicle.plate}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, plate: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Marca</label>
                    <input
                      value={editing.vehicle.make}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, make: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Modelo</label>
                    <input
                      value={editing.vehicle.model}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, model: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Versión</label>
                    <input
                      value={editing.vehicle.version}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, version: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Año</label>
                    <input
                      inputMode="numeric"
                      value={editing.vehicle.year}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, year: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Localidad</label>
                    <input
                      value={editing.vehicle.city}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, city: e.target.value } }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="actions">
                <button className="btn btn--primary" type="submit">Guardar</button>
                <button
                  className="btn btn--outline"
                  type="button"
                  onClick={() => { setDrawerOpen(false); setEditing(null); }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
          <div
            className="drawer__scrim"
            onClick={() => { setDrawerOpen(false); setEditing(null); }}
          />
        </div>
      )}

      {/* Modal rápido para cuota */}
      {premiumEdit.open && (
        <div className="drawer">
          <div className="drawer__panel" style={{ maxWidth: 420 }}>
            <div className="drawer__head">
              <h2>Modificar cuota</h2>
              <button
                className="btn btn--outline"
                onClick={() => setPremiumEdit({ open: false, id: null, value: "" })}
              >
                Cerrar
              </button>
            </div>
            <div className="form">
              <div className="field">
                <label>Nueva cuota mensual</label>
                <input
                  inputMode="decimal"
                  value={premiumEdit.value}
                  onChange={(e) => setPremiumEdit((s) => ({ ...s, value: e.target.value }))}
                />
              </div>
              <div className="actions">
                <button className="btn btn--primary" onClick={saveQuickPremium}>Guardar</button>
                <button
                  className="btn btn--outline"
                  onClick={() => setPremiumEdit({ open: false, id: null, value: "" })}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
          <div
            className="drawer__scrim"
            onClick={() => setPremiumEdit({ open: false, id: null, value: "" })}
          />
        </div>
      )}

    </section>
  );
}
