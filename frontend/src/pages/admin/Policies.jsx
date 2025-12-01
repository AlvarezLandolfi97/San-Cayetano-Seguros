import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { fetchQuoteShare } from "@/services/quoteShare";

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

function deriveStatus(status, endDate) {
  const d = daysUntil(endDate);
  if (["cancelled", "inactive", "suspended"].includes(status)) return status;
  if (d < 0) return "expired";
  if (status === "expired") return "active";
  return status || "active";
}

export default function Policies() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [compact, setCompact] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE_OPTIONS = [10, 25, 50];
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [statusFilter, setStatusFilter] = useState("");

  // combos
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  // búsqueda simple
  const [q, setQ] = useState("");

  // drawer crear/editar
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [quoteLink, setQuoteLink] = useState("");
  const [quoteLoadErr, setQuoteLoadErr] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);

  // modal de gestión rápida
  const [manageModal, setManageModal] = useState({ open: false, row: null, draft: null, saving: false });
  const [expandedId, setExpandedId] = useState(null);
  const [inlineDraft, setInlineDraft] = useState(null);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, row: null, loading: false });
  const [restoreConfirm, setRestoreConfirm] = useState({ open: false, row: null, loading: false });
  const [showArchived, setShowArchived] = useState(false);

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
        status: deriveStatus(p.status, p.end_date),
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
      const matchesTerm = !term || parts.includes(term);
      const matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [rows, q, statusFilter]);

  const activeFiltered = useMemo(() => filtered.filter((r) => r.status !== "inactive"), [filtered]);
  const archivedFiltered = useMemo(() => filtered.filter((r) => r.status === "inactive"), [filtered]);

    const { expiring, others } = useMemo(() => {
      const exp = [];
      const rest = [];
      for (const p of activeFiltered) {
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
  }, [activeFiltered, threshold]);

  const tableRows = useMemo(() => [...expiring, ...others], [expiring, others]);
  const displayUser = (r) =>
    r.user
      ? `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() || r.user.email || r.user.id
      : r.user_id || "—";
  const statusClass = (status) => (status ? `status--${status}` : "status--default");
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((tableRows.length || 1) / pageSize)),
    [tableRows.length, pageSize]
  );
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, page, pageSize]);
  const showingActive = useMemo(() => {
    if (!tableRows.length) return { start: 0, end: 0, total: 0 };
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(tableRows.length, page * pageSize);
    return { start, end, total: tableRows.length };
  }, [tableRows.length, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [tableRows.length, pageSize]);

  const draftFromRow = (row) => ({
    id: row.id,
    number: row.number || "",
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
    setQuoteLink("");
    setQuoteLoadErr("");
    setQuoteLoading(false);
    setDrawerOpen(true);
  }

  function openManage(row) {
    setManageModal({
      open: true,
      row,
      draft: draftFromRow(row),
      saving: false,
    });
  }

  function closeManage() {
    setManageModal({ open: false, row: null, draft: null, saving: false });
  }

  function updateInlineDraft(field, value, nested = false) {
    setInlineDraft((d) => {
      if (!d) return d;
      return nested ? { ...d, vehicle: { ...d.vehicle, [field]: value } } : { ...d, [field]: value };
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

  function parseQuoteLink(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) throw new Error("Pegá el link de la cotización.");

    let hash = "";
    try {
      const url = new URL(trimmed);
      hash = url.hash?.slice(1) || "";
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "share");
      if (idx >= 0 && parts[idx + 1]) return { id: parts[idx + 1] };
    } catch {
      // no es URL, seguimos intentando
    }

    if (/^[a-zA-Z0-9]{6,}$/i.test(trimmed)) return { id: trimmed };

    if (!hash && trimmed.includes("#")) {
      const [, h] = trimmed.split("#");
      hash = h;
    }
    if (hash) return { legacyHash: decodeURIComponent(hash) };

    throw new Error("Link de cotización inválido.");
  }

  async function fillFromQuoteLink() {
    if (!editing) return;
    setQuoteLoadErr("");
    setQuoteLoading(true);
    try {
      const parsed = parseQuoteLink(quoteLink);
      let data = null;
      if (parsed.id) {
        data = await fetchQuoteShare(parsed.id);
      } else if (parsed.legacyHash) {
        const { decompressFromEncodedURIComponent } = await import("lz-string");
        const json = decompressFromEncodedURIComponent(parsed.legacyHash);
        if (!json) throw new Error("No se pudo leer la ficha del link.");
        data = JSON.parse(json);
      }
      if (!data) throw new Error("No se encontró la ficha.");

      setEditing((prev) => ({
        ...prev,
        vehicle: {
          ...prev.vehicle,
          make: data.make || "",
          model: data.model || "",
          version: data.version || "",
          year: data.year || "",
          city: data.city || "",
        },
      }));
      setQuoteLoadErr("");
    } catch (e) {
      setQuoteLoadErr(e?.response?.data?.detail || e?.message || "No se pudo leer el link.");
    } finally {
      setQuoteLoading(false);
    }
  }

  function askDelete(row) {
    setDeleteConfirm({ open: true, row, loading: false });
  }

  async function confirmDelete() {
    if (!deleteConfirm.row) return;
    setDeleteConfirm((s) => ({ ...s, loading: true }));
    try {
      await api.patch(`/admin/policies/${deleteConfirm.row.id}`, { status: "inactive", user_id: null });
      await fetchPolicies();
      if (expandedId === deleteConfirm.row.id) {
        setExpandedId(null);
        setInlineDraft(null);
      }
      setDeleteConfirm({ open: false, row: null, loading: false });
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
      setDeleteConfirm((s) => ({ ...s, loading: false }));
    }
  }

  function closeDeleteModal() {
    if (deleteConfirm.loading) return;
    setDeleteConfirm({ open: false, row: null, loading: false });
  }

  function askRestore(row) {
    setRestoreConfirm({ open: true, row, loading: false });
  }

  async function confirmRestore() {
    if (!restoreConfirm.row) return;
    setRestoreConfirm((s) => ({ ...s, loading: true }));
    try {
      await api.patch(`/admin/policies/${restoreConfirm.row.id}`, { status: "active" });
      await fetchPolicies();
      setRestoreConfirm({ open: false, row: null, loading: false });
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo recuperar la póliza.");
      setRestoreConfirm((s) => ({ ...s, loading: false }));
    }
  }

  function closeRestoreModal() {
    if (restoreConfirm.loading) return;
    setRestoreConfirm({ open: false, row: null, loading: false });
  }

  // ------- cuota rápida -------
  function updateManageDraft(field, value, nested = false) {
    setManageModal((m) => {
      if (!m.draft) return m;
      const updated = nested
        ? { ...m.draft, vehicle: { ...m.draft.vehicle, [field]: value } }
        : { ...m.draft, [field]: value };
      return { ...m, draft: updated };
    });
  }

  async function saveManage() {
    if (!manageModal.draft?.id) return;
    setManageModal((m) => ({ ...m, saving: true }));
    try {
      const payload = {
        number: manageModal.draft.number || null,
        user_id: manageModal.draft.user_id || null,
        status: manageModal.draft.status || "active",
        start_date: manageModal.draft.start_date || null,
        end_date: manageModal.draft.end_date || null,
        premium: manageModal.draft.premium === "" ? null : Number(manageModal.draft.premium),
        vehicle: manageModal.draft.vehicle,
      };
      await api.patch(`/admin/policies/${manageModal.draft.id}`, payload);
      await fetchPolicies();
      closeManage();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo guardar los cambios.");
      setManageModal((m) => ({ ...m, saving: false }));
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
    <section className="section container policies-page">
      <header className="admin__head">
        <div>
          <h1>Pólizas</h1>
        </div>
        <button
          className="btn btn--primary ml-auto align-self-center"
          onClick={openCreate}
        >
          Nueva póliza
        </button>
      </header>

      {err && <div className="register-alert mt-8">{err}</div>}

      {/* Sección destacada: Próximo a vencer */}
      {expiring.length > 0 && (
        <div className="card-like card--expiring">
          <h3 className="heading-tight">Próximo a vencer</h3>
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
                          <span className={`badge badge--status ${statusClass(r.status)} countdown-badge`}>
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
                          <div className="detail-value detail-inline detail-inline--dates">
                            <input className="detail-input" type="date" value={draft.start_date} onChange={(e) => updateInlineDraft("start_date", e.target.value)} />
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
                          <button className="btn btn--danger" onClick={() => askDelete(r)}>Eliminar</button>
                          <button className="btn btn--primary" onClick={saveInline} disabled={inlineSaving}>Guardar cambios</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table policies-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Seguro</th>
                    <th>Patente</th>
                  <th>Usuario</th>
                  <th>Vence en</th>
                  <th>Vigencia</th>
                  <th>Cuota</th>
                  <th className="actions-col" aria-label="Acciones"></th>
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
                        <span className="countdown-chip" title={`Faltan ${r.__daysLeft} día(s)`}>
                          {r.__daysLeft} día{r.__daysLeft === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="small">
                        {r.start_date || "—"} → {r.end_date || "—"}
                      </td>
                      <td>${r.premium ?? "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn--outline" onClick={() => openManage(r)}>
                            Gestionar
                          </button>
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
        <div className="pagination pagination--enhanced">
          <select
            className="status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Todos</option>
            <option value="active">Activa</option>
            <option value="suspended">Suspendida</option>
            <option value="expired">Vencida</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <input
            className="admin__search"
            placeholder="Buscar por número de póliza, patente o cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="pagination__controls">
            <button className="btn btn--outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </button>
            <span className="muted">Página {page} de {pageCount}</span>
            <button className="btn btn--outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>
              Siguiente
            </button>
          </div>
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
                          <span className={`badge badge--status ${statusClass(r.status)}`}>{r.status}</span>
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
                          <button className="btn btn--danger" onClick={() => askDelete(r)}>Eliminar</button>
                          <button className="btn btn--primary" onClick={saveInline} disabled={inlineSaving}>Guardar cambios</button>
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
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Seguro</th>
                  <th>Patente</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Vigencia</th>
                  <th>Cuota</th>
                  <th className="actions-col" aria-label="Acciones"></th>
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
                      <td>
                        <span className={`badge badge--status ${statusClass(r.status)}`}>
                          {r.status || "—"}
                        </span>
                      </td>
                      <td className="small">
                        {r.start_date || "—"} → {r.end_date || "—"}
                      </td>
                      <td>${r.premium ?? "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn--outline" onClick={() => openManage(r)}>
                            Gestionar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination pagination--enhanced pagination--end">
          <div className="pagination__controls">
            <button className="btn btn--outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </button>
            <span className="muted">Página {page} de {pageCount}</span>
            <button className="btn btn--outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal de gestión completa */}
      {manageModal.open && manageModal.draft && (
        <div className="drawer drawer--modal">
          <div className="drawer__panel manage-modal">
            <div className="drawer__head">
              <h2>Gestionar póliza {manageModal.row?.number || `#${manageModal.row?.id}`}</h2>
              <button className="drawer__close" aria-label="Cerrar" onClick={closeManage}>
                &times;
              </button>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <div className="detail-label">Seguro</div>
                <div className="detail-value">{manageModal.row?.product?.name || "—"}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Usuario</div>
                <select
                  className="detail-input"
                  value={manageModal.draft.user_id ?? ""}
                  onChange={(e) => updateManageDraft("user_id", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Sin usuario —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>
              <div className="detail-row">
                <div className="detail-label">Estado</div>
                <select
                  className="detail-input"
                  value={manageModal.draft.status}
                  onChange={(e) => updateManageDraft("status", e.target.value)}
                >
                  <option value="active">Activa</option>
                  <option value="suspended">Suspendida</option>
                  <option value="expired">Vencida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
              <div className="detail-row">
                <div className="detail-label">Vigencia</div>
                <div className="detail-value detail-inline detail-inline--dates">
                  <input
                    className="detail-input"
                    type="date"
                    value={manageModal.draft.start_date}
                    onChange={(e) => updateManageDraft("start_date", e.target.value)}
                  />
                  <input
                    className="detail-input"
                    type="date"
                    value={manageModal.draft.end_date}
                    onChange={(e) => updateManageDraft("end_date", e.target.value)}
                  />
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Cuota</div>
                <input
                  className="detail-input"
                  value={manageModal.draft.premium ?? ""}
                  onChange={(e) => updateManageDraft("premium", e.target.value)}
                />
              </div>
              <div className="detail-row">
                <div className="detail-label">Vehículo</div>
                <div className="detail-value detail-inline vehicle-grid">
                  <input
                    className="detail-input"
                    placeholder="Patente"
                    value={manageModal.draft.vehicle?.plate || ""}
                    onChange={(e) => updateManageDraft("plate", e.target.value, true)}
                  />
                  <input
                    className="detail-input"
                    placeholder="Marca"
                    value={manageModal.draft.vehicle?.make || ""}
                    onChange={(e) => updateManageDraft("make", e.target.value, true)}
                  />
                  <input
                    className="detail-input"
                    placeholder="Modelo"
                    value={manageModal.draft.vehicle?.model || ""}
                    onChange={(e) => updateManageDraft("model", e.target.value, true)}
                  />
                  <input
                    className="detail-input"
                    placeholder="Versión"
                    value={manageModal.draft.vehicle?.version || ""}
                    onChange={(e) => updateManageDraft("version", e.target.value, true)}
                  />
                  <input
                    className="detail-input"
                    placeholder="Año"
                    value={manageModal.draft.vehicle?.year || ""}
                    onChange={(e) => updateManageDraft("year", e.target.value, true)}
                  />
                  <input
                    className="detail-input"
                    placeholder="Ciudad"
                    value={manageModal.draft.vehicle?.city || ""}
                    onChange={(e) => updateManageDraft("city", e.target.value, true)}
                  />
                </div>
              </div>
            </div>
            <div className="actions actions--end">
              <button
                className="btn btn--danger"
                onClick={() => {
                  askDelete(manageModal.row);
                  closeManage();
                }}
                disabled={manageModal.saving}
              >
                Eliminar
              </button>
              <button className="btn btn--primary" onClick={saveManage} disabled={manageModal.saving}>
                {manageModal.saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
          <div className="drawer__scrim" onClick={closeManage} />
        </div>
      )}

      {/* Recuperación de pólizas inactivas */}
      <div className="card-like recovery-card">
        <div className="admin__head admin__head--tight">
          <div className="recovery-head">
            <h3 className="heading-tight m-0">Pólizas eliminadas</h3>
          </div>
          <button type="button" className="btn btn--subtle" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Ocultar" : "Ver lista"}
          </button>
        </div>
        {showArchived && (
          archivedFiltered.length === 0 ? (
            <p className="muted">No hay pólizas inactivas.</p>
          ) : (
            <div className="table-wrap">
              <table className="table policies-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Patente</th>
                    <th>Usuario</th>
                    <th className="actions-col" aria-label="Acciones"></th>
                  </tr>
                </thead>
                <tbody>
                  {archivedFiltered.map((r) => (
                    <tr key={`arch-${r.id}`}>
                      <td>{r.number || `#${r.id}`}</td>
                      <td>{r.vehicle?.plate || "—"}</td>
                      <td>{displayUser(r)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn--outline" onClick={() => askRestore(r)}>
                            Recuperar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Drawer crear/editar */}
      {drawerOpen && (
        <div className="drawer drawer--form">
          <div className="drawer__panel drawer__panel--wide">
            <div className="drawer__head">
              <h2>{editing?.id ? "Editar póliza" : "Nueva póliza"}</h2>
              <button
                className="drawer__close"
                aria-label="Cerrar"
                onClick={() => { setDrawerOpen(false); setEditing(null); }}
              >
                &times;
              </button>
            </div>

            <form className="form policy-form" onSubmit={onSave}>
              <div className="detail-list">
                <div className="detail-row">
                  <div className="detail-label">Número</div>
                  <input
                    className="detail-input"
                    value={editing.number}
                    onChange={(e) => setEditing((p) => ({ ...p, number: e.target.value }))}
                  />
                </div>

                <div className="detail-row">
                  <div className="detail-label">Seguro</div>
                  <select
                    className="detail-input"
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

                <div className="detail-row">
                  <div className="detail-label">Usuario (opcional)</div>
                  <select
                    className="detail-input"
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

                <div className="detail-row">
                  <div className="detail-label">Estado</div>
                  <select
                    className="detail-input"
                    value={editing.status}
                    onChange={(e) => setEditing((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Activa</option>
                    <option value="suspended">Suspendida</option>
                    <option value="expired">Vencida</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Inicio</div>
                  <input
                    className="detail-input"
                    type="date"
                    value={editing.start_date}
                    onChange={(e) => setEditing((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>

                <div className="detail-row">
                  <div className="detail-label">Fin</div>
                  <input
                    className="detail-input"
                    type="date"
                    value={editing.end_date}
                    onChange={(e) => setEditing((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>

                <div className="detail-row">
                  <div className="detail-label">Cuota mensual</div>
                  <input
                    className="detail-input"
                    inputMode="decimal"
                    value={editing.premium}
                    onChange={(e) => setEditing((p) => ({ ...p, premium: e.target.value }))}
                  />
                </div>

                <div className="detail-row">
                  <div className="detail-label">Link de cotización</div>
                  <div className="detail-value detail-inline">
                    <input
                      className="detail-input"
                      placeholder="Ej: https://.../quote/share/abc123"
                      value={quoteLink}
                      onChange={(e) => setQuoteLink(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={fillFromQuoteLink}
                      disabled={quoteLoading}
                    >
                      {quoteLoading ? "Cargando..." : "Autocompletar vehículo"}
                    </button>
                  </div>
                  {quoteLoadErr && <small className="warn-text">{quoteLoadErr}</small>}
                </div>

                <div className="detail-row">
                  <div className="detail-label">Vehículo</div>
                  <div className="detail-value detail-inline vehicle-grid">
                    <input
                      className="detail-input"
                      placeholder="Patente"
                      value={editing.vehicle.plate}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, plate: e.target.value } }))
                      }
                    />
                    <input
                      className="detail-input"
                      placeholder="Marca"
                      value={editing.vehicle.make}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, make: e.target.value } }))
                      }
                    />
                    <input
                      className="detail-input"
                      placeholder="Modelo"
                      value={editing.vehicle.model}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, model: e.target.value } }))
                      }
                    />
                    <input
                      className="detail-input"
                      placeholder="Versión"
                      value={editing.vehicle.version}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, version: e.target.value } }))
                      }
                    />
                    <input
                      className="detail-input"
                      placeholder="Año"
                      inputMode="numeric"
                      value={editing.vehicle.year}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, year: e.target.value } }))
                      }
                    />
                    <input
                      className="detail-input"
                      placeholder="Localidad"
                      value={editing.vehicle.city}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vehicle: { ...p.vehicle, city: e.target.value } }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="actions actions--divider actions--end">
                <button
                  className="btn btn--outline"
                  type="button"
                  onClick={() => { setDrawerOpen(false); setEditing(null); }}
                >
                  Cancelar
                </button>
                <button className="btn btn--primary" type="submit">Guardar</button>
              </div>
            </form>
          </div>
          <div
            className="drawer__scrim"
            onClick={() => { setDrawerOpen(false); setEditing(null); }}
          />
        </div>
      )}

      {/* Confirmación de eliminación */}
      {deleteConfirm.open && (
        <div className="drawer drawer--modal">
          <div className="drawer__panel drawer__panel--small">
            <div className="drawer__head">
              <h2>Eliminar póliza</h2>
              <button className="drawer__close" onClick={closeDeleteModal} aria-label="Cerrar">
                &times;
              </button>
            </div>
            <p>
              ¿Seguro que querés eliminar la póliza{" "}
              <strong>{deleteConfirm.row?.number || `#${deleteConfirm.row?.id}`}</strong>?
              Se marcará como inactiva y podrás recuperarla luego.
              {deleteConfirm.row?.user && (
                <>
                  {" "}
                  Está asociada a{" "}
                  <strong>
                    {[deleteConfirm.row.user.first_name, deleteConfirm.row.user.last_name]
                      .filter(Boolean)
                      .join(" ") || deleteConfirm.row.user.email || deleteConfirm.row.user.id}
                  </strong>
                  ; al eliminarla dejará de verse en su listado de pólizas.
                </>
              )}
            </p>
            <div className="actions">
              <button className="btn btn--outline" onClick={closeDeleteModal} disabled={deleteConfirm.loading}>
                Cancelar
              </button>
              <button className="btn btn--danger" onClick={confirmDelete} disabled={deleteConfirm.loading}>
                {deleteConfirm.loading ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
          <div className="drawer__scrim" onClick={closeDeleteModal} />
        </div>
      )}

      {/* Confirmación de recuperación */}
      {restoreConfirm.open && (
        <div className="drawer drawer--modal">
          <div className="drawer__panel drawer__panel--small">
            <div className="drawer__head">
              <h2>Recuperar póliza</h2>
              <button className="drawer__close" onClick={closeRestoreModal} aria-label="Cerrar">
                &times;
              </button>
            </div>
            <p>
              ¿Seguro que querés recuperar la póliza{" "}
              <strong>{restoreConfirm.row?.number || `#${restoreConfirm.row?.id}`}</strong>?
              Volverá a quedar activa.
              {restoreConfirm.row?.user && (
                <> El usuario{" "}
                  <strong>
                    {[restoreConfirm.row.user.first_name, restoreConfirm.row.user.last_name]
                      .filter(Boolean)
                      .join(" ") || restoreConfirm.row.user.email || restoreConfirm.row.user.id}
                  </strong>{" "}
                  volverá a verla en su listado.
                </>
              )}
            </p>
            <div className="actions">
              <button className="btn btn--outline" onClick={closeRestoreModal} disabled={restoreConfirm.loading}>
                Cancelar
              </button>
              <button className="btn btn--primary" onClick={confirmRestore} disabled={restoreConfirm.loading}>
                {restoreConfirm.loading ? "Restaurando…" : "Recuperar"}
              </button>
            </div>
          </div>
          <div className="drawer__scrim" onClick={closeRestoreModal} />
        </div>
      )}

    </section>
  );
}
