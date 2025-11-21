import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import useAuth from "@/hooks/useAuth";

export default function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // si tu backend tiene endpoint de logout, se puede llamar
        await api.post("/auth/logout").catch(() => {});
      } finally {
        logout(); // limpia tokens y estado
        setProcessing(false);
        navigate("/login", { replace: true });
      }
    })();
  }, [logout, navigate]);

  return (
    <section style={{ padding: "4rem", textAlign: "center" }}>
      {processing ? (
        <>
          <h2>Cerrando sesión...</h2>
          <p>Por favor esperá un momento.</p>
        </>
      ) : null}
    </section>
  );
}
