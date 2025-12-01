import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buildWhatsAppLink, cleanPhone } from "@/utils/wa";
import { saveQuoteShare } from "@/services/quoteShare";
import { fetchRemoteMakes, fetchRemoteModels, fetchRemoteVersions } from "@/services/vehicleApi";
import "@/styles/Quote.module.css";

const USAGES = [
  { value: "privado", label: "Uso privado" },
  { value: "comercial", label: "Uso comercial" },
];

const THIS_YEAR = new Date().getFullYear();
const YEAR_MIN = THIS_YEAR - 40;
const YEAR_MAX = THIS_YEAR;

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
  const [remoteModels, setRemoteModels] = useState({});
  const [remoteMakes, setRemoteMakes] = useState([]);
  const [remoteVersions, setRemoteVersions] = useState({});
  const [showBrandList, setShowBrandList] = useState(false);
  const [showModelList, setShowModelList] = useState(false);
  const [showVersionList, setShowVersionList] = useState(false);
  const [sent, setSent] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [waOpenFailed, setWaOpenFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const clearFieldError = (name) =>
    setFieldErrors((fe) => {
      if (!fe[name]) return fe;
      const next = { ...fe };
      delete next[name];
      return next;
    });
  const inputClass = (name, value) => {
    const classes = [];
    if (fieldErrors[name]) classes.push("input-error");
    if (value) classes.push("input-filled");
    return classes.join(" ");
  };
  const YEAR_OPTIONS = useMemo(
    () => Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i),
    []
  );

  const brandOptions = useMemo(
    () => Array.from(new Set(remoteMakes)).sort((a, b) => a.localeCompare(b)),
    [remoteMakes]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetchRemoteMakes(ctrl.signal).then((list) => {
      setRemoteMakes(Array.isArray(list) ? list : []);
    });
    return () => ctrl.abort();
  }, []);

  const modelsForBrand = useMemo(() => {
    return remoteModels[form.make] || [];
  }, [form.make, remoteModels]);

  useEffect(() => {
    if (!form.make || Object.prototype.hasOwnProperty.call(remoteModels, form.make)) return;
    const ctrl = new AbortController();
    fetchRemoteModels(form.make, ctrl.signal).then((list) => {
      setRemoteModels((prev) => {
        if (Object.prototype.hasOwnProperty.call(prev, form.make)) return prev;
        return { ...prev, [form.make]: list || [] };
      });
    });
    return () => ctrl.abort();
  }, [form.make, remoteModels]);

  useEffect(() => {
    if (!form.make || !form.model) return;
    const key = `${form.make}__${form.model}`;
    if (Object.prototype.hasOwnProperty.call(remoteVersions, key)) return;
    const ctrl = new AbortController();
    fetchRemoteVersions(form.make, form.model, ctrl.signal).then((list) => {
      setRemoteVersions((prev) => {
        if (Object.prototype.hasOwnProperty.call(prev, key)) return prev;
        return { ...prev, [key]: list || [] };
      });
    });
    return () => ctrl.abort();
  }, [form.make, form.model, remoteVersions]);

  const versionsForModel = useMemo(() => {
    const key = `${form.make}__${form.model}`;
    return remoteVersions[key] || [];
  }, [form.make, form.model, remoteVersions]);

  const hasModels = modelsForBrand.length > 0;
  const hasVersions = versionsForModel.length > 0;
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    clearFieldError(name);
  };

  const filterList = (list, value) => {
    const v = (value || "").toLowerCase();
    if (!v) return list;
    return list.filter((item) => item.toLowerCase().includes(v));
  };

  const [brandQuery, setBrandQuery] = useState(form.make || "");
  const [modelQuery, setModelQuery] = useState(form.model || "");
  const [versionQuery, setVersionQuery] = useState(form.version || "");

  const brandMatches = useMemo(() => filterList(brandOptions, brandQuery), [brandOptions, brandQuery]);
  const modelMatches = useMemo(
    () => filterList(modelsForBrand.map((m) => m.name), modelQuery),
    [modelsForBrand, modelQuery]
  );
  const versionMatches = useMemo(
    () => filterList(versionsForModel.map((v) => v.name), versionQuery),
    [versionsForModel, versionQuery]
  );

  const yearChoices = useMemo(() => {
    const selYears = versionsForModel.find((v) => v.name === form.version)?.years || [];
    return Array.from(new Set([...(selYears || []), ...YEAR_OPTIONS])).sort((a, b) => b - a);
  }, [versionsForModel, form.version, YEAR_OPTIONS]);

  const applyBrand = (value) => {
    setBrandQuery(value);
    onBrandChange({ target: { value } });
    setShowBrandList(false);
    clearFieldError("make");
    clearFieldError("model");
    clearFieldError("version");
    clearFieldError("year");
  };

  const applyModel = (value) => {
    setModelQuery(value);
    onModelChange({ target: { value } });
    setShowModelList(false);
    clearFieldError("model");
    clearFieldError("version");
    clearFieldError("year");
  };

  const applyVersion = (value) => {
    setVersionQuery(value);
    onVersionChange({ target: { value } });
    setShowVersionList(false);
    clearFieldError("version");
  };

  const onYearChange = (e) => {
    const year = e.target.value;
    setForm((f) => ({ ...f, year }));
    clearFieldError("year");
  };

  const onBrandChange = (e) => {
    const make = e.target.value;
    setBrandQuery(make);
    setModelQuery("");
    setVersionQuery("");
    setForm((f) => ({ ...f, make, year: "", model: "", version: "" }));
    clearFieldError("make");
    if (make && !Object.prototype.hasOwnProperty.call(remoteModels, make)) {
      const ctrl = new AbortController();
      fetchRemoteModels(make, ctrl.signal).then((list) => {
        setRemoteModels((prev) => {
          if (Object.prototype.hasOwnProperty.call(prev, make)) return prev;
          return { ...prev, [make]: list || [] };
        });
      });
    }
  };
  const onModelChange = (e) => {
    const model = e.target.value;
    setModelQuery(model);
    setVersionQuery("");
    setForm((f) => ({ ...f, model, version: "", year: "" }));
    clearFieldError("model");
  };
  const onVersionChange = (e) => {
    const version = e.target.value;
    setVersionQuery(version);
    setForm((f) => ({ ...f, version }));
    clearFieldError("version");
  };

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

  const canSubmit = useMemo(() => !busy, [busy]);

  function validate() {
    const errs = {};
    if (!phoneOk) errs.phone = "Ingresá un WhatsApp válido (ej: 2211234567 o +54 9 2211234567).";
    if (!form.make) errs.make = "Seleccioná la marca.";
    if (!form.model) errs.model = "Seleccioná el modelo.";
    if (!form.version) errs.version = "Ingresá la versión.";
    if (!yearOk) errs.year = `Ingresá un año entre ${YEAR_MIN} y ${YEAR_MAX}.`;
    if (!form.city) errs.city = "Ingresá la localidad.";
    if (!["si", "no"].includes(form.has_garage)) errs.has_garage = "Indicá si guarda en garage.";
    if (!["si", "no"].includes(form.is_zero_km)) errs.is_zero_km = "Indicá si es 0 km.";
    if (!["privado", "comercial"].includes(form.usage)) errs.usage = "Indicá el uso.";
    if (!["si", "no"].includes(form.has_gnc)) errs.has_gnc = "Indicá si tiene GNC.";
    if (form.has_gnc === "si" && !/^\d+([.,]\d{1,2})?$/.test(String(form.gnc_amount || "")))
      errs.gnc_amount = "Ingresá el monto a asegurar para el GNC.";
    if (!files.front || !files.back || !files.right || !files.left)
      errs.photos = "Subí las 4 fotos: adelante, atrás, derecha e izquierda.";

    const message = Object.keys(errs).length ? "Es necesario completar todos los campos requeridos." : "";
    return { message, errs };
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
    // 1) Reducir y serializar imágenes (se guardan en backend)
    const photos = {
      front: await fileToResizedDataURL(files.front),
      back:  await fileToResizedDataURL(files.back),
      right: await fileToResizedDataURL(files.right),
      left:  await fileToResizedDataURL(files.left),
    };
    // 2) Armar payload y persistir
    const payload = {
      plan_code: form.plan_code || undefined,
      plan_name: form.plan_name || undefined,
      phone: cleanPhone(form.phone),
      make: form.make,
      model: form.model,
      version: form.version,
      year: Number(form.year),
      city: form.city,
      has_garage: form.has_garage === "si",
      is_zero_km: form.is_zero_km === "si",
      usage: form.usage,
      has_gnc: form.has_gnc === "si",
      gnc_amount: form.has_gnc === "si" ? String(form.gnc_amount).replace(",", ".") : undefined,
      photos,
    };
    const { id } = await saveQuoteShare(payload);
    const origin = (typeof location !== "undefined" && location.origin) ? location.origin.replace(/\/$/, "") : "";
    return `${origin}/quote/share/${id}`;
  }

  async function shareQuote() {
    const shareLink = await buildShareLink();
    setShareLink(shareLink);
    setCopyFeedback("");
    setWaOpenFailed(false);

    const msg = [
      "Hola! Estoy interesado en cotizar mi vehículo.",
      "Ficha completa (incluye fotos):",
      shareLink,
    ].join("\n");
    const insurerNumber = import.meta.env.VITE_WA_INSURER_NUMBER || "2216922121";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

    // En desktop priorizamos web.whatsapp.com (menos bloqueado que wa.me/api)
    const waUrl = isMobile
      ? buildWhatsAppLink(insurerNumber, msg, { preferApi: true })
      : buildWhatsAppLink(insurerNumber, msg, { preferWeb: true });

    try {
      const win = window.open(waUrl, "_blank", "noopener,noreferrer");
      if (!win) setWaOpenFailed(true); // popup bloqueado
    } catch {
      setWaOpenFailed(true);
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setSent(false);
    const { message, errs } = validate();
    setFieldErrors(errs);
    if (message) {
      setErr(message);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await shareQuote();
      setSent(true);
    } catch (e) {
      const apiMsg = e?.response?.data?.detail || e?.response?.data?.error;
      const fallback = e?.message || "No se pudo generar el link. Intentalo nuevamente.";
      setErr(apiMsg || fallback);
    } finally {
      setBusy(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopyFeedback("Link copiado. Pegalo en un mail o chat y abrilo desde allí.");
    } catch {
      setCopyFeedback("No se pudo copiar automáticamente. Seleccioná y copiá el link manualmente.");
    }
  };

  return (
    <main id="main" className="section container quote-page">
      <h1 style={{ marginBottom: 8 }}>Solicitar cotización</h1>
      <p className="muted">Ingresá tus datos y abriremos WhatsApp con un link a tu ficha completa (incluye las fotos).</p>

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

      <form onSubmit={onSubmit} className="register-form" noValidate>
        {err && <div className="register-alert" role="alert" aria-live="assertive" style={{ marginBottom: 8 }}>{err}</div>}
        {/* WhatsApp */}
        <div className="form-group">
          <label>Número de WhatsApp</label>
          <input className={inputClass("phone", form.phone)} name="phone" placeholder="Ej: 221 123 4567" value={form.phone} onChange={onChange} required inputMode="tel" autoComplete="tel" />
        </div>

        {/* Marca y modelo */}
        <div className="form-row">
          <div className="form-group">
            <label>Marca</label>
            <div className="autocomplete-wrapper">
              <input
                className={inputClass("make", brandQuery)}
                name="make"
                value={brandQuery}
                onChange={(e) => applyBrand(e.target.value)}
                placeholder="Elegí o ingresá la marca"
                required
                autoComplete="off"
                onFocus={() => setShowBrandList(true)}
                onBlur={() => setTimeout(() => setShowBrandList(false), 100)}
              />
              {showBrandList && brandMatches.length > 0 && (
                <div className="autocomplete-list">
                  {brandMatches.map((b) => (
                    <div
                      key={b}
                      className="autocomplete-item"
                      role="button"
                      tabIndex={0}
                      onMouseDown={() => applyBrand(b)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") applyBrand(b);
                      }}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!brandOptions.length && <small className="hint">No pudimos cargar las marcas, ingresala manualmente.</small>}
          </div>
          <div className="form-group">
            <label>Modelo</label>
            <div className="autocomplete-wrapper">
              <input
                className={inputClass("model", modelQuery)}
                name="model"
                value={modelQuery}
                onChange={(e) => applyModel(e.target.value)}
                placeholder="Elegí o ingresá el modelo"
                required
                disabled={!form.make}
                autoComplete="off"
                onFocus={() => setShowModelList(true)}
                onBlur={() => setTimeout(() => setShowModelList(false), 100)}
              />
              {showModelList && hasModels && modelMatches.length > 0 && (
                <div className="autocomplete-list">
                  {modelMatches.map((m) => (
                    <div
                      key={m}
                      className="autocomplete-item"
                      role="button"
                      tabIndex={0}
                      onMouseDown={() => applyModel(m)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") applyModel(m);
                      }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!hasModels && form.make && (
              <small className="hint">Esta marca no tiene modelos precargados, ingresalo.</small>
            )}
          </div>
        </div>

        {/* Versión y año */}
        <div className="form-row">
          <div className="form-group">
            <label>Versión</label>
            <div className="autocomplete-wrapper">
              <input
                className={inputClass("version", versionQuery)}
                name="version"
                value={versionQuery}
                onChange={(e) => applyVersion(e.target.value)}
                placeholder="Elegí o ingresá la versión"
                required
                disabled={!form.model}
                autoComplete="off"
                onFocus={() => setShowVersionList(true)}
                onBlur={() => setTimeout(() => setShowVersionList(false), 100)}
              />
              {showVersionList && hasVersions && versionMatches.length > 0 && (
                <div className="autocomplete-list">
                  {versionMatches.map((v) => (
                    <div
                      key={v}
                      className="autocomplete-item"
                      role="button"
                      tabIndex={0}
                      onMouseDown={() => applyVersion(v)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") applyVersion(v);
                      }}
                    >
                      {v}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!hasVersions && form.model && (
              <small className="hint">No hay versiones precargadas, ingresala manualmente.</small>
            )}
          </div>
          <div className="form-group">
            <label>Año</label>
            <select
              className={inputClass("year", form.year)}
              name="year"
              value={form.year}
              onChange={onYearChange}
              required
            >
              <option value="">Elegí el año</option>
              {yearChoices.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Localidad y garage */}
        <div className="form-row">
          <div className="form-group">
            <label>Localidad</label>
            <input className={inputClass("city", form.city)} name="city" value={form.city} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>¿Lo guarda en garage?</label>
            <select className={inputClass("has_garage", form.has_garage)} name="has_garage" value={form.has_garage} onChange={onChange} required>
              <option value="">Elegí una opción</option><option value="si">Sí</option><option value="no">No</option>
            </select>
          </div>
        </div>

        {/* 0 km y uso */}
        <div className="form-row">
          <div className="form-group">
            <label>¿Es 0 km?</label>
            <select className={inputClass("is_zero_km", form.is_zero_km)} name="is_zero_km" value={form.is_zero_km} onChange={onChange} required>
              <option value="">Elegí una opción</option><option value="si">Sí</option><option value="no">No</option>
            </select>
          </div>
          <div className="form-group">
            <label>Uso</label>
            <select className={inputClass("usage", form.usage)} name="usage" value={form.usage} onChange={onChange} required>
              <option value="">Elegí una opción</option>
              {USAGES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        {/* GNC y monto */}
        <div className="form-row">
          <div className="form-group">
            <label>¿Tiene GNC?</label>
            <select className={inputClass("has_gnc", form.has_gnc)} name="has_gnc" value={form.has_gnc} onChange={onChange} required>
              <option value="">Elegí una opción</option><option value="si">Sí</option><option value="no">No</option>
            </select>
          </div>
          {form.has_gnc === "si" && (
            <div className="form-group">
              <label>Monto a asegurar (GNC)</label>
              <input className={inputClass("gnc_amount", form.gnc_amount)} name="gnc_amount" inputMode="decimal" placeholder="Ej: 250000" value={form.gnc_amount} onChange={onChange} required />
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
              hasFile={!!files.front}
              onFile={onFile("front")}
              refImg="/illustrations/front-car.png"
            />
            <PhotoInput
              label="Foto atrás"
              keyName="back"
              preview={previews.back}
              hasFile={!!files.back}
              onFile={onFile("back")}
              refImg="/illustrations/back-car.png"
            />
            <PhotoInput
              label="Foto derecha"
              keyName="right"
              preview={previews.right}
              hasFile={!!files.right}
              onFile={onFile("right")}
              refImg="/illustrations/right-car.png"
            />
            <PhotoInput
              label="Foto izquierda"
              keyName="left"
              preview={previews.left}
              hasFile={!!files.left}
              onFile={onFile("left")}
              refImg="/illustrations/left-car.png"
            />
          </div>
          {fieldErrors.photos && <p className="warn-text">{fieldErrors.photos}</p>}
        </section>

        <button type="submit" className="btn btn--primary register-btn" disabled={!canSubmit || busy} aria-busy={busy ? "true" : "false"}>
          {busy
            ? "Generando link…"
            : sent
              ? "Enviada ✔"
              : "Enviar cotización por WhatsApp"}
        </button>

        {err && (
          <div className="inline-error" role="alert" aria-live="assertive">
            {err}
          </div>
        )}

        {shareLink && (
          <div className="wa-fallback" role="note">
            <strong>Si WhatsApp no abre:</strong>
            <p>Copiá este link y enviálo por mail u otro chat. Al abrirlo se ven todos los datos y fotos.</p>
            <div className="wa-fallback__row">
              <input value={shareLink} readOnly />
              <button type="button" className="btn btn--secondary" onClick={copyShareLink}>Copiar link</button>
            </div>
            {copyFeedback && <small className="hint">{copyFeedback}</small>}
            {waOpenFailed && <small className="warn">No pudimos abrir WhatsApp desde el navegador. Compartí el link por otro medio.</small>}
          </div>
        )}
      </form>
    </main>
  );
}

function PhotoInput({ label, preview, onFile, refImg, hasFile }) {
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

      <input type="file" accept="image/*" onChange={onFile} data-has-file={hasFile ? "true" : "false"} />
      <p className="photo-status">{hasFile ? "Imagen cargada" : "Aún no se cargó ninguna foto"}</p>
    </div>
  );
}
