import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // Si tu backend tiene endpoint de logout, podrías llamarlo aquí (opcional)
        // await api.post("/auth/logout");
      } finally {
        logout();          // limpia token + estado
        navigate("/login", { replace: true });
      }
    })();
  }, [logout, navigate]);

  return null; // no renderizamos nada; solo redirigimos
}
