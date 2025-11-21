import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastCtx = createContext(null);
let idSeq = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((payload) => {
    const id = idSeq++;
    const toast = {
      id,
      type: payload.type || "info", // success | error | warning | info
      title: payload.title || "",
      message: payload.message || "",
      duration: payload.duration ?? 3500,
    };
    setToasts((ts) => [...ts, toast]);
    if (toast.duration > 0) {
      setTimeout(() => remove(id), toast.duration);
    }
    return id;
  }, [remove]);

  const value = useMemo(() => ({ notify, remove }), [notify, remove]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onClose={remove} />
    </ToastCtx.Provider>
  );
}

export default function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

function Toaster({ toasts, onClose }) {
  return (
    <div className="toaster">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} role="status" aria-live="polite">
          <div className="toast__content">
            {t.title && <strong className="toast__title">{t.title}</strong>}
            {t.message && <div className="toast__msg">{t.message}</div>}
          </div>
          <button className="toast__close" onClick={() => onClose(t.id)} aria-label="Cerrar">×</button>
        </div>
      ))}
    </div>
  );
}
