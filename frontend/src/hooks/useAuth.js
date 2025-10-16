import { useState, useEffect, useCallback } from "react";
import { api } from "../api";

export default function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const login = useCallback(async ({ dni, password }) => {
    const { data } = await api.post("/auth/login", { dni, password });
    localStorage.setItem("token", data.access);
    setToken(data.access);
    return data;
  }, []);

  // NUEVO: registro
  const register = useCallback(async ({ full_name, email, dni, phone, password }) => {
    const { data } = await api.post("/auth/register", { full_name, email, dni, phone, password });
    // asumimos que devuelve access como login
    localStorage.setItem("token", data.access);
    setToken(data.access);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, loading, login, logout, register };
}
