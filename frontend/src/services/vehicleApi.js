const CQ_BASE = "https://www.carqueryapi.com/api/0.3/?";

function normalize(str = "") {
  return String(str).trim();
}

function carQueryJsonp(params = "", signal) {
  return new Promise((resolve, reject) => {
    const cbName = `cq_cb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      window[cbName] = undefined;
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = (e) => {
      cleanup();
      reject(e);
    };
    script.src = `${CQ_BASE}${params}&callback=${cbName}`;
    document.body.appendChild(script);

    if (signal) {
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

export async function fetchRemoteMakes(signal) {
  try {
    const data = await carQueryJsonp("cmd=getMakes&sold_in_us=0", signal);
    const list = Array.isArray(data?.Makes) ? data.Makes : [];
    return list
      .map((m) => normalize(m.make_display || m.make_name))
      .filter(Boolean)
      .map((name) => name.toUpperCase());
  } catch (err) {
    console.warn("[vehicleApi] makes error", err?.message || err);
    return [];
  }
}

export async function fetchRemoteModels(make, signal) {
  if (!make) return [];
  try {
    const data = await carQueryJsonp(
      `cmd=getModels&make=${encodeURIComponent(make)}&sold_in_us=0`,
      signal
    );
    const list = Array.isArray(data?.Models) ? data.Models : [];
    const names = [];
    const seen = new Set();
    list
      .map((m) => normalize(m.model_name))
      .filter(Boolean)
      .forEach((name) => {
        if (seen.has(name)) return;
        seen.add(name);
        names.push(name);
      });
    return names.map((name) => ({ name }));
  } catch (err) {
    console.warn("[vehicleApi] models error", err?.message || err);
    return [];
  }
}

export async function fetchRemoteVersions(make, model, signal) {
  if (!make || !model) return [];
  try {
    const data = await carQueryJsonp(
      `cmd=getTrims&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&sold_in_us=0`,
      signal
    );
    const list = Array.isArray(data?.Trims) ? data.Trims : [];
    const grouped = {};
    list.forEach((t) => {
      const name = normalize(t.model_trim) || normalize(t.model_name);
      if (!name) return;
      const year = Number(t.model_year);
      if (!grouped[name]) grouped[name] = new Set();
      if (Number.isFinite(year)) grouped[name].add(year);
    });
    return Object.entries(grouped).map(([name, yearsSet]) => ({
      name,
      years: Array.from(yearsSet).sort((a, b) => b - a),
    }));
  } catch (err) {
    console.warn("[vehicleApi] versions error", err?.message || err);
    return [];
  }
}
