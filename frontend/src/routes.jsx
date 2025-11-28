// src/routes.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import useAuth from "@/hooks/useAuth";

// Layout UI
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import AnnouncementBar from "@/components/ui/AnnouncementBar";

// Páginas públicas
import Home from "@/pages/Home";
import Quote from "@/pages/Quote";
import QuoteShare from "@/pages/QuoteShare";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Logout from "@/pages/Logout";
import ResetRequest from "@/pages/ResetRequest";
import ResetConfirm from "@/pages/ResetConfirm";

// Pólizas
import PolicyDetail from "@/pages/PolicyDetail";
import ClaimPolicy from "@/pages/ClaimPolicy";

// Dashboard usuario
import UserDashboardLayout from "@/pages/dashboard/UserDashboardLayout";
import PolicyOverview from "@/pages/dashboard/PolicyOverview";
import Payments from "@/pages/dashboard/Payments";
import Profile from "@/pages/dashboard/Profile";

// Admin
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminHome from "@/pages/admin/AdminHome";
import InsuranceTypes from "@/pages/admin/InsuranceTypes";
import Policies from "@/pages/admin/Policies";
import Users from "@/pages/admin/Users";
import ContactInfoAdmin from "@/pages/admin/ContactInfo";

// -------- Guards --------
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminGate() {
  const { user } = useAuth();
  const isAdmin = !!(user?.is_admin || user?.isAdmin || user?.is_staff);
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard/seguro" replace />;
}

function UserGate() {
  const { user } = useAuth();
  const isAdmin = !!(user?.is_admin || user?.isAdmin || user?.is_staff);
  return !isAdmin ? <Outlet /> : <Navigate to="/admin" replace />;
}

// -------- Página 404 --------
function NotFound() {
  return (
    <section className="section container">
      <h1>404</h1>
      <p>La página que buscás no existe.</p>
    </section>
  );
}

// -------- Rutas principales --------
export default function AppRoutes() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main id="main">
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/quote/share" element={<QuoteShare />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/reset" element={<ResetRequest />} />
          <Route path="/reset/confirm" element={<ResetConfirm />} />

          {/* Pólizas públicas */}
          <Route path="/policy/:id" element={<PolicyDetail />} />
          <Route path="/claim-policy" element={<ClaimPolicy />} />

          {/* ÁREA PRIVADA */}
          <Route element={<RequireAuth />}>
            {/* Usuario */}
            <Route element={<UserGate />}>
              <Route path="/dashboard" element={<UserDashboardLayout />}>
                <Route index element={<PolicyOverview />} />
                <Route path="seguro" element={<PolicyOverview />} />
                <Route path="pagos" element={<Payments />} />
                <Route path="perfil" element={<Profile />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route element={<AdminGate />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="seguros" element={<InsuranceTypes />} />
                <Route path="polizas" element={<Policies />} />
                <Route path="usuarios" element={<Users />} />
                <Route path="contacto" element={<ContactInfoAdmin />} />
                <Route path="inicio" element={<AdminHome />} />
              </Route>
            </Route>
          </Route>

          {/* Compat */}
          <Route path="/home" element={<Navigate to="/" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
