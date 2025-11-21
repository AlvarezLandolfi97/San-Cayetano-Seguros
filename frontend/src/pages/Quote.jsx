import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buildWhatsAppLink, cleanPhone } from "@/utils/wa";
import "@/styles/Quote.module.css";

const USAGES = [
  { value: "privado", label: "Uso privado" },
  { value: "comercial", label: "Uso comercial" },
];

const THIS_YEAR = new Date().getFullYear();
const YEAR_MIN = 1980;
const YEAR_MAX = THIS_YEAR + 1;

export default function Quote() {
  const [sp] = useSearchParams();

  const initialPlan = useMemo(() => {
    const code = sp.get("plan") || sp.get("plan_code") || "";
    const name = sp.get("plan_name") || "";
    return code || name ? { code, name: name || code } : null;
  }, [sp]);

  const initialFormFromQS = useMemo(() => {
    const get = (k, fallback = "") => sp.get(k) ?? fallback;
    const yn = (v) => (v === "1" || v?.toLowerCase() === "si" ? "si" : v === "0" || v?.toLowerCase() === "no" ? "no" : "");
    return {
      phone: get("phone"),
      make: get("make"),
      model: get("model"),
      version: get("version"),
      year: get("year"),
      city: get("city"),
      has_garage: yn(get("has_garage")),
      is_zero_km: yn(get("is_zero_km")),
      usage: ["privado", "comercial"].includes(get("usage")) ? get("usage") : "",
      has_gnc: yn(get("has_gnc")),
      gnc_amount: get("gnc_amount"),
      plan_code: get("plan_code") || get("plan") || "",
      plan_name: get("plan_name"),
    };
  }, [sp]);

  const [form, setForm] = useState({
    phone: "",
    make: "",
    model: "",
    version: "",
    year: "",
    city: "",
    has_garage: "",
    is_zero_km: "",
    usage: "",
    has_gnc: "",
    gnc_amount: "",
    plan_code: "",
    plan_name: "",
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      ...initialFormFromQS,
      ...(initialPlan ? { plan_code: initialPlan.code || f.plan_code, plan_name: initialPlan.name || f.plan_name } : {}),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlan, initialFormFromQS]);

  const [files, setFiles] = useState({ front: null, back: null, right: null, left: null });
  const [previews, setPreviews] = useState({ front: "", back: "", right: "", left: "" });
  const objectUrlsRef = useRef({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onFile = (key) => (e) => {
    const f = e.target.files?.[0] || null;
    if (objectUrlsRef.current[key]) {
      URL.revokeObjectURL(objectUrlsRef.current[key]);
      objectUrlsRef.current[key] = undefined;
    }
    setFiles((fs) => ({ ...fs, [key]: f }));
    if (f) {
      if (!/^image\//.test(f.type)) {
        setErr("Formato de imagen inválido.");
        setPreviews((p) => ({ ...p, [key]: "" }));
        return;
      }
      if (f.size > 10 * 1024 * 1024) { // permitimos 10MB antes de comprimir
        setErr("Cada imagen debe pesar menos de 10MB.");
        setPreviews((p) => ({ ...p, [key]: "" }));
        return;
      }
      const url = URL.createObjectURL(f);
      objectUrlsRef.current[key] = url;
      setPreviews((p) => ({ ...p, [key]: url }));
    } else {
      setPreviews((p) => ({ ...p, [key]: "" }));
    }
  };

  useEffect(() => {
    return () => {
      Object.values(objectUrlsRef.current).forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, []);

  const phoneOk = useMemo(() => /^\+?\d{10,15}$/.test(cleanPhone(form.phone)), [form.phone]);
  const yearOk = useMemo(() => {
    const n = Number(form.year);
    return Number.isFinite(n) && n >= YEAR_MIN && n <= YEAR_MAX;
  }, [form.year]);

  const canSubmit = useMemo(() => {
    if (!phoneOk || !yearOk) return false;
    const common =
      form.make && form.model && form.version && form.year && form.city &&
      (form.has_garage === "si" || form.has_garage === "no") &&
      (form.is_zero_km === "si" || form.is_zero_km === "no") &&
      (form.usage === "privado" || form.usage === "comercial") &&
      (form.has_gnc === "si" || form.has_gnc === "no");
    if (!common) return false;
    if (form.has_gnc === "si" && !/^\d+([.,]\d{1,2})?$/.test(String(form.gnc_amount || ""))) return false;
    if (!files.front || !files.back || !files.right || !files.left) return false;
    return true;
  }, [form, files, phoneOk, yearOk]);

  function validate() {
    if (!phoneOk) return "Ingresá un WhatsApp válido (ej: +5492211234567).";
    if (!form.make) return "Seleccioná la marca.";
    if (!form.model) return "Seleccioná el modelo.";
    if (!form.version) return "Ingresá la versión.";
    if (!yearOk) return `Ingresá un año entre ${YEAR_MIN} y ${YEAR_MAX}.`;
    if (!form.city) return "Ingresá la localidad.";
    if (!["si", "no"].includes(form.has_garage)) return "Indicá si guarda en garage.";
    if (!["si", "no"].includes(form.is_zero_km)) return "Indicá si es 0 km.";
    if (!["privado", "comercial"].includes(form.usage)) return "Indicá el uso.";
    if (!["si", "no"].includes(form.has_gnc)) return "Indicá si tiene GNC.";
    if (form.has_gnc === "si" && !/^\d+([.,]\d{1,2})?$/.test(String(form.gnc_amount || "")))
      return "Ingresá el monto a asegurar para el GNC.";
    if (!files.front || !files.back || !files.right || !files.left)
      return "Subí las 4 fotos: adelante, atrás, derecha e izquierda.";
    return "";
  }

  // --- helpers: redimensionar imagen y generar enlace comprimido ---
  async function fileToResizedDataURL(file, maxSide = 1024, quality = 0.7) {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = URL.createObjectURL(file);
    });
    const { width, height } = img;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    URL.revokeObjectURL(img.src);
    return dataUrl;
  }

  async function buildShareLink() {
    // 1) Reducir y serializar imágenes
    const photos = {
      front: await fileToResizedDataURL(files.front),
      back:  await fileToResizedDataURL(files.back),
      right: await fileToResizedDataURL(files.right),
      left:  await fileToResizedDataURL(files.left),
    };
    // 2) Armar payload
    const payload = {
      plan_code: form.plan_code || undefined,
      plan_name: form.plan_name || undefined,
      phone: cleanPhone(form.phone),
      make: form.make,
      model: form.model,
      version: form.version,
      year: form.year,
      city: form.city,
      has_garage: form.has_garage === "si",
      is_zero_km: form.is_zero_km === "si",
      usage: form.usage,
      has_gnc: form.has_gnc === "si",
      gnc_amount: form.has_gnc === "si" ? String(form.gnc_amount).replace(",", ".") : undefined,
      photos,
    };
    // 3) Comprimir en hash con lz-string (carga on-demand)
    const { compressToEncodedURIComponent } = await import("lz-string");
    const encoded = compressToEncodedURIComponent(JSON.stringify(payload));
    return `${location.origin}/quote/share#${encoded}`;
  }

  async function openWhatsAppWithShareLink() {
    const shareLink = await buildShareLink();
    const msg = `Hola! Estoy interesado en cotizar mi vehiculo, estos son mis datos: ${shareLink}`;
    const insurerNumber = import.meta.env.VITE_WA_INSURER_NUMBER || "";
    const url = buildWhatsAppLink(insurerNumber, msg);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) return setErr(v);
    setErr("");
    setBusy(true);
    try {
      await openWhatsAppWithShareLink();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="section container">
      <h1>Solicitar cotización</h1>
      <p>Ingresá tus datos y abriremos WhatsApp con un link a tu ficha completa (incluye las fotos).</p>

      {(form.plan_code || form.plan_name) && (
        <div className="card" style={{ margin: "12px 0 16px", display: "flex", alignItems: "center", gap: 8 }} role="note">
          <span style={{ background: "#eaf2ff", border: "1px solid #d6e6ff", color: "#0d47a1", fontWeight: 800, padding: "4px 10px", borderRadius: 999, fontSize: ".9rem" }}>
            {form.plan_code || "Plan"}
          </span>
          <strong>{form.plan_name}</strong>
          <button type="button" className="btn btn--outline" style={{ marginLeft: "auto" }}
            onClick={() => setForm((f) => ({ ...f, plan_code: "", plan_name: "" }))}>
            Quitar plan
          </button>
          <Link to="/plans" className="btn btn--primary">Ver otros planes</Link>
        </div>
      )}

      {err && <div className="register-alert" role="alert" aria-live="assertive">{err}</div>}

      <form onSubmit={onSubmit} className="register-form" noValidate>
        {/* WhatsApp */}
        <div className="form-group">
          <label>Número de WhatsApp</label>
          <input name="phone" placeholder="+54 9 ..." value={form.phone} onChange={onChange} required inputMode="tel" autoComplete="tel" />
          <small className="hint">Formato recomendado: +54 9 221 ....</small>
        </div>

        {/* Marca/Modelo/Versión/Año */}
        <div className="form-row">
          <div className="form-group"><label>Marca</label><input name="make" value={form.make} onChange={onChange} required /></div>
          <div className="form-group"><label>Modelo</label><input name="model" value={form.model} onChange={onChange} required /></div>
        </div>

        <div className="form-row">
          <div className="form-group"><label>Versión</label><input name="version" value={form.version} onChange={onChange} required /></div>
          <div className="form-group">
            <label>Año</label>
            <input name="year" inputMode="numeric" value={form.year} onChange={onChange} required placeholder={`${YEAR_MIN} - ${YEAR_MAX}`} />
            <small className="hint">Entre {YEAR_MIN} y {YEAR_MAX}</small>
          </div>
        </div>

        {/* Localidad / Garage / 0km / Uso */}
        <div className="form-group"><label>Localidad</label><input name="city" value={form.city} onChange={onChange} required /></div>

        <div className="form-row">
          <div className="form-group">
            <label>¿Lo guarda en garage?</label>
            <select name="has_garage" value={form.has_garage} onChange={onChange} required>
              <option value="">Elegí una opción</option><option value="si">Sí</option><option value="no">No</option>
            </select>
          </div>
          <div className="form-group">
            <label>¿Es 0 km?</label>
            <select name="is_zero_km" value={form.is_zero_km} onChange={onChange} required>
              <option value="">Elegí una opción</option><option value="si">Sí</option><option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Uso</label>
          <select name="usage" value={form.usage} onChange={onChange} required>
            <option value="">Elegí una opción</option>
            {USAGES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>

        {/* GNC */}
        <div className="form-row">
          <div className="form-group">
            <label>¿Tiene GNC?</label>
            <select name="has_gnc" value={form.has_gnc} onChange={onChange} required>
              <option value="">Elegí una opción</option><option value="si">Sí</option><option value="no">No</option>
            </select>
          </div>
          {form.has_gnc === "si" && (
            <div className="form-group">
              <label>Monto a asegurar (GNC)</label>
              <input name="gnc_amount" inputMode="decimal" placeholder="Ej: 250000" value={form.gnc_amount} onChange={onChange} required />
            </div>
          )}
        </div>

        {/* Fotos */}
        <section className="photo-section">
          <h3>Fotos del vehículo</h3>
          <p className="hint">Subí una foto por cada lado, usando las referencias para orientación.</p>

          <div className="photo-grid">
            <PhotoInput
              label="Foto adelante"
              keyName="front"
              preview={previews.front}
              onFile={onFile("front")}
              refImg="/illustrations/front-car.png"
            />
            <PhotoInput
              label="Foto atrás"
              keyName="back"
              preview={previews.back}
              onFile={onFile("back")}
              refImg="/illustrations/back-car.png"
            />
            <PhotoInput
              label="Foto derecha"
              keyName="right"
              preview={previews.right}
              onFile={onFile("right")}
              refImg="/illustrations/right-car.png"
            />
            <PhotoInput
              label="Foto izquierda"
              keyName="left"
              preview={previews.left}
              onFile={onFile("left")}
              refImg="/illustrations/left-car.png"
            />
          </div>
        </section>

        <button type="submit" className="btn btn--primary register-btn" disabled={!canSubmit || busy} aria-busy={busy ? "true" : "false"}>
          {busy ? "Generando link…" : "Enviar cotización por WhatsApp"}
        </button>

        <p className="register-login" style={{ marginTop: 12 }}>
          ¿Ya tenés cuenta? <Link to="/login" className="link">Iniciá sesión</Link>
        </p>
      </form>
    </main>
  );
}

function PhotoInput({ label, preview, onFile, refImg }) {
  return (
    <div className="photo-input">
      <label>{label}</label>

      <div className="photo-ref">
        <img
          src={refImg}
          alt={`Referencia ${label}`}
          className="photo-hint"
          loading="lazy"
        />
      </div>

      <input type="file" accept="image/*" onChange={onFile} />

      {preview ? (
        <img src={preview} alt={label} className="photo-preview" />
      ) : (
        <p className="hint muted">Aún no se cargó ninguna foto</p>
      )}
    </div>
  );
}
