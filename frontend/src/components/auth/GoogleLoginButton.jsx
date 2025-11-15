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
export default function GoogleLoginButton({ onErrorMessage, onLoggedIn }) {
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
      console.error(err);
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

  return (
    <div className="google-login" aria-busy={busy}>
      {/* useOneTap puede reintentar silenciosamente, lo dejamos activo */}
      <GoogleLogin onSuccess={handleSuccess} onError={handleError} useOneTap />
    </div>
  );
}
