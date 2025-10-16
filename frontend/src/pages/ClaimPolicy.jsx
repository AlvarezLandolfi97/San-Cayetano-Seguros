import { useState } from "react";
import { api } from "../api";
import { isPlate, normPlate, isDniLast4 } from "../validators";

export default function ClaimPolicy() {
  const [mode, setMode] = useState("plate"); // "plate" | "policy"
  const [form, setForm] = useState({ plate:"", policy_id:"", dni_last4:"" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const onChange = (e) => setForm(f => ({...f, [e.target.name]: e.target.value}));

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!isDniLast4(form.dni_last4)) return setMsg("Ingresá los últimos 4 del DNI.");
    const payload = { dni_last4: form.dni_last4 };
    if (mode === "plate") {
      if (!isPlate(form.plate)) return setMsg("Patente inválida.");
      payload.plate = normPlate(form.plate);
    } else {
      if (!/^\d+$/.test(form.policy_id)) return setMsg("ID de póliza inválido.");
      payload.policy_id = Number(form.policy_id);
    }

    try {
      setLoading(true);
      const { data } = await api.post("/policies/claim", payload);
      setMsg(`✅ Póliza vinculada: ${data.policy.number} (${data.policy.product_name})`);
    } catch (e2) {
      const d = e2?.response?.data;
      setMsg(d?.detail || "No pudimos vincular la póliza. Verificá los datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="container" style={{maxWidth: 640, padding:"2rem 1rem"}}>
      <h1>Vincular póliza a mi cuenta</h1>
      <p className="text-muted">Usá tu patente + últimos 4 del DNI o el número de póliza + últimos 4 del DNI.</p>

      <div className="card" style={{padding:"1rem"}}>
        <div style={{display:"flex", gap:8, marginBottom:12}}>
          <button className={`chip ${mode==="plate"?"chip--active":""}`} onClick={()=>setMode("plate")}>Por patente</button>
          <button className={`chip ${mode==="policy"?"chip--active":""}`} onClick={()=>setMode("policy")}>Por número de póliza</button>
        </div>

        <form onSubmit={onSubmit} className="form" style={{gap:12}}>
          {msg && <div className="alert" role="status">{msg}</div>}

          {mode==="plate" ? (
            <label>
              <span>Patente (AA123BB / ABC123)</span>
              <input name="plate" value={form.plate} onChange={onChange} placeholder="AA123BB" />
            </label>
          ) : (
            <label>
              <span>ID o número de póliza</span>
              <input name="policy_id" value={form.policy_id} onChange={onChange} placeholder="12345" />
            </label>
          )}

          <label>
            <span>Últimos 4 del DNI del titular</span>
            <input name="dni_last4" value={form.dni_last4} onChange={onChange} placeholder="1234" />
          </label>

          <div style={{marginTop:8}}>
            <button className="btn btn--primary" disabled={loading}>
              {loading ? "Vinculando..." : "Vincular"} 
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
