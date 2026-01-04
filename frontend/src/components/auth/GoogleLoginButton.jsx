// src/components/auth/GoogleLoginButton.jsx
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import useAuth from "@/hooks/useAuth";

/**
 * Botón de login con Google
 * - Usa el método centralizado `googleLogin({ id_token })` de useAuth
 * - Maneja errores y estado local "busy"
 *
 * Props:
 * - onErrorMessage?: (msg: string) => void
 * - onLoggedIn?: () => void   // opcional, se llama al loguear ok
 */
export default function GoogleLoginButton({ onErrorMessage, onLoggedIn, disabled }) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const enabled = googleClientId && import.meta.env.VITE_ENABLE_GOOGLE === "true";
  if (!enabled) return null;

  const { googleLogin } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSuccess = async (response) => {
    try {
      const credential = response?.credential;
      if (!credential) throw new Error("Sin credential de Google");
      setBusy(true);
      await googleLogin({ id_token: credential }); // <- delega en el hook
      onLoggedIn?.();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error(err);
      }
      const status = err?.response?.status;
      if (status === 404 || status === 403) {
        onErrorMessage?.("Login con Google no disponible.");
        return;
      }
      if (status === 400) {
        onErrorMessage?.("No se pudo validar tu cuenta de Google.");
        return;
      }
      onErrorMessage?.(
        "No pudimos iniciar sesión con Google. Probá nuevamente."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleError = () => {
    onErrorMessage?.("No pudimos iniciar sesión con Google. Probá nuevamente.");
  };

  const ariaBusy = busy || disabled;
  return (
    <div
      className="google-login__button"
      aria-busy={ariaBusy}
      aria-disabled={Boolean(disabled)}
    >
      {/* useOneTap puede reintentar silenciosamente, lo dejamos activo */}
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap
        disabled={disabled || busy}
        text="continue_with"
      />
    </div>
  );
}
