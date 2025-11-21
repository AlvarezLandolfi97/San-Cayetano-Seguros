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
  }, []);

  // ------- helpers visuales -------
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const parts = [
        r.number,
        r.product?.name,
        r.vehicle?.plate,
        r.user?.email,
        r.user?.first_name,
        r.user?.last_name,
        r.status,
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
          <p className="muted">
            Crear, editar, eliminar y asociar pólizas. Usá el botón directo para <strong>modificar la cuota</strong>.
          </p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>Nueva póliza</button>
      </header>

      {err && <div className="register-alert" style={{ marginTop: 8 }}>{err}</div>}

      {/* Preferencia: umbral de “próximo a vencer” */}
      <div className="card-like" style={{ marginBottom: 16 }}>
        <div className="filters" style={{ alignItems: "center", gap: 12 }}>
          <label className="muted">Avisar (y destacar) cuando falten</label>
          <select
            value={threshold}
            onChange={(e) => saveThreshold(Number(e.target.value))}
            disabled={savingThreshold}
          >
            {[3,5,7,10,15,20,30].map((n) => (
              <option key={n} value={n}>{n} días</option>
            ))}
          </select>
          <span className="muted">para el vencimiento.</span>
          <div style={{ marginLeft: "auto", maxWidth: 360, width: "100%" }}>
            <input
              placeholder="Buscar por número, patente, seguro o usuario…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Sección destacada: Próximo a vencer */}
      {expiring.length > 0 && (
        <div className="card-like" style={{ borderColor: "#ffe6bf", background: "#fffaf2" }}>
          <h3 style={{ marginTop: 0 }}>Próximo a vencer</h3>
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
                    <td>
                      {r.user
                        ? `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() || r.user.email || r.user.id
                        : r.user_id || "—"}
                    </td>
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
        </div>
      )}

      {/* Tabla general (expiring primero) */}
      <div className="card-like">
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
                tableRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.number || `#${r.id}`}</td>
                    <td>{r.product?.name || "—"}</td>
                    <td>{r.vehicle?.plate || "—"}</td>
                    <td>
                      {r.user
                        ? `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() || r.user.email || r.user.id
                        : r.user_id || "—"}
                    </td>
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
