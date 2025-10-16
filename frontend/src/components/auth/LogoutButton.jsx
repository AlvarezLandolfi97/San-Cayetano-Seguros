import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function LogoutButton({ className = "btn btn--secondary" }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const onClick = async () => {
    try {
      // Opcional: await api.post("/auth/logout");
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <button onClick={onClick} className={className} aria-label="Cerrar sesión">
      Cerrar sesión
    </button>
  );
}
