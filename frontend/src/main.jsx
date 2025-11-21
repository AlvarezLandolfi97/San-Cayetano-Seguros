// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/contexts/ToastContext";
import ErrorBoundary from "@/components/util/ErrorBoundary";
import AppRoutes from "./routes.jsx";

import "@/styles/reset.css";
import "@/styles/base.css";
import "@/styles/loader.css";
import "@/styles/toast.css";

async function enableMocks() {
  if (import.meta.env.VITE_USE_MSW === "true") {
    const { worker } = await import("./mocks/browser");
    await worker.start({
      serviceWorker: { url: "/mockServiceWorker.js" },
      onUnhandledRequest: "bypass",
    });
    console.log("[MSW] Mocking enabled.");
  }
}

enableMocks().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
});
