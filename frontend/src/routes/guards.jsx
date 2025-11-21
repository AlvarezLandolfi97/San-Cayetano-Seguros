// src/routes/guards.jsx
import { Navigate, Outlet } from "react-router-dom";
import useAuth from "@/hooks/useAuth";

export function RequireAuth(){
  const { user } = useAuth();
  return user ? <Outlet/> : <Navigate to="/login" replace />;
}
export function AdminGate(){
  const { user } = useAuth();
  return user?.is_admin ? <Outlet/> : <Navigate to="/dashboard/seguro" replace />;
}
export function UserGate(){
  const { user } = useAuth();
  return user?.is_admin ? <Navigate to="/admin" replace /> : <Outlet/>;
}
