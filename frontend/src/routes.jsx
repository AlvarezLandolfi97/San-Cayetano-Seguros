// frontend/src/routes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/ui/Navbar";
import Footer from "./components/ui/Footer";

import Home from "./pages/Home";
import QuotePage from "./pages/QuotePage";
import Register from "./pages/Register";
import ClaimPolicy from "./pages/ClaimPolicy";
import Login from "./pages/Login";
import ResetRequest from "./pages/ResetRequest";
import ResetConfirm from "./pages/ResetConfirm";
import Logout from "./pages/Logout";

import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardHome from "./components/dashboard/DashboardHome";
import Payments from "./components/dashboard/Payments";
import Profile from "./components/dashboard/Profile";

import useAuth from "./hooks/useAuth";

/* =========================================================
   🔒 RUTA PRIVADA
   ========================================================= */
function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* =========================================================
   📦 LAYOUT GENERAL (Navbar + Footer)
   ========================================================= */
function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}

/* =========================================================
   🚦 RUTAS PRINCIPALES DE LA APP
   ========================================================= */
export default function AppRoutes() {
  return (
    <Routes>
      {/* 🏠 Home */}
      <Route path="/" element={<Layout><Home /></Layout>} />

      {/* 🚗 Cotizar */}
      <Route path="/quote" element={<Layout><QuotePage /></Layout>} />

      {/* 🧾 Reclamo (privado) */}
      <Route
        path="/claim"
        element={
          <PrivateRoute>
            <Layout><ClaimPolicy /></Layout>
          </PrivateRoute>
        }
      />

      {/* 👤 Registro / Login / Logout */}
      <Route path="/register" element={<Layout><Register /></Layout>} />
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/logout" element={<Logout />} />

      {/* 🔑 Recuperación de contraseña */}
      <Route path="/reset" element={<Layout><ResetRequest /></Layout>} />
      <Route path="/reset/confirm" element={<Layout><ResetConfirm /></Layout>} />

      {/* =========================================================
          🧭 DASHBOARD PRIVADO (Panel del usuario)
         ========================================================= */}
      <Route
        path="/dashboard"
        element={
          <Layout>
            <DashboardLayout />
          </Layout>
        }
      >
        {/* Rutas internas del dashboard */}
        <Route index element={<DashboardHome />} />               {/* Mis Seguros */}
        <Route path="payments" element={<Payments />} />           {/* Pagos */}
        <Route path="profile" element={<Profile />} />             {/* Mi perfil */}
      </Route>

      {/* 🚫 Redirección 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
