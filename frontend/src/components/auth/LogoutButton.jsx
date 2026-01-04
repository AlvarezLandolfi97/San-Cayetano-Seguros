import { api, getStoredAuth } from "@/api";
import useAuth from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function LogoutButton({ className = "btn btn--secondary" }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const cleanup = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const onClick = async () => {
    const { refresh } = getStoredAuth();
    if (!refresh) {
      cleanup();
      return;
    }

    try {
      await api.post("/auth/logout/", { refresh }, { requiresAuth: false });
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error("[LogoutButton] Logout request failed", error);
      }
    } finally {
      cleanup();
    }
  };

  return (
    <button
      onClick={onClick}
      className={className}
      aria-label="Cerrar sesión"
      data-testid="logout-button"
    >
      Cerrar sesión
    </button>
  );
}
