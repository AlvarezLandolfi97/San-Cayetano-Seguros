// src/api.js
import axios from "axios";

/* ============== Auth store simple (fuera de React) ============== */
const LS_ACCESS = "sc_access";
const LS_REFRESH = "sc_refresh";
const LS_USER = "sc_user";

const authStore = {
  get access() {
    try { return JSON.parse(localStorage.getItem(LS_ACCESS)); } catch { return null; }
  },
  set access(token) {
    if (!token) localStorage.removeItem(LS_ACCESS);
    else localStorage.setItem(LS_ACCESS, JSON.stringify(token));
  },
  get refresh() {
    try { return JSON.parse(localStorage.getItem(LS_REFRESH)); } catch { return null; }
  },
  set refresh(token) {
    if (!token) localStorage.removeItem(LS_REFRESH);
    else localStorage.setItem(LS_REFRESH, JSON.stringify(token));
  },
};

/* ============== Base URL unificada ============== */
function stripTrailingSlash(s = "") {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
const API_BASE = (() => {
  const env = import.meta.env;
  const base =
    env.VITE_API_URL ??
    env.VITE_API_BASE ??
    (env.DEV ? "/api" : "http://localhost:8000/api");
  return stripTrailingSlash(base); // ← evita /api/ doble
})();

/* ============== Axios instance ============== */
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 15000,
  headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
});

/* ============== Request interceptor: auth + avisos dev ============== */
const ABSOLUTE_URL = /^https?:\/\//i;

api.interceptors.request.use((config) => {
  // Token
  const token = authStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Avisos de DX
  if (import.meta.env.DEV) {
    const full = `${config.baseURL || ""}${config.url || ""}`;
    if (full.includes("/api/api/")) {
      // eslint-disable-next-line no-console
      console.warn("[API] Detectado doble /api/ en:", full);
    }
    if (ABSOLUTE_URL.test(config.url || "")) {
      console.warn("[API] Evitá URL absolutas en llamadas:", config.url);
    }
  }

  return config;
});

/* ============== Response interceptor: refresh 401 con cola ============== */
let isRefreshing = false;
let queue = [];

function flushQueue(error, token = null) {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (!original || original._retry) throw err;

    // Solo reintentar en 401 si tenemos refresh token
    if (err?.response?.status === 401 && authStore.refresh) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (newToken) => {
              if (newToken) original.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      try {
        // Usamos el MISMO cliente para respetar baseURL y headers
        const { data } = await api.post("/auth/refresh", { refresh: authStore.refresh });
        const newAccess = data?.access;
        if (!newAccess) throw err;

        authStore.access = newAccess;
        flushQueue(null, newAccess);

        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        flushQueue(e, null);
        clearAuth();
        throw e;
      } finally {
        isRefreshing = false;
      }
    }

    throw err;
  }
);

/* ============== Helpers públicos ============== */
export function setAuth({ access, refresh, user } = {}) {
  if (access) authStore.access = access;
  if (refresh) authStore.refresh = refresh;
  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_USER);
}

export function getAuthUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER)); } catch { return null; }
}

export { API_BASE };
