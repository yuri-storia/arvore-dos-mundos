import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { IdrielJobsProvider } from "@/contexts/IdrielJobsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy-loaded pages (Sprint 1 / P0 #3: route-level code splitting)
const Index = lazy(() => import("./pages/Index"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const ObrigadoPage = lazy(() => import("./pages/ObrigadoPage"));
const BetaPage = lazy(() => import("./pages/BetaPage"));
const SegurancaPage = lazy(() => import("./pages/SegurancaPage"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div
    role="status"
    aria-label="Carregando"
    className="min-h-screen flex items-center justify-center bg-[#02070d]"
  >
    <div className="h-10 w-10 rounded-full border-2 border-[hsl(var(--gold))] border-t-transparent animate-spin" />
  </div>
);

// Root: landing page for guests, app for authenticated users
const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  return user ? <ProtectedRoute><Index /></ProtectedRoute> : <LandingPage />;
};



const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <IdrielJobsProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/inicio" element={<Navigate to="/planos" replace />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/" element={<HomeRoute />} />
                <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/planos" element={<PricingPage />} />
                <Route path="/obrigado" element={<ObrigadoPage />} />
                <Route path="/beta" element={<BetaPage />} />
                <Route path="/seguranca" element={<SegurancaPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </IdrielJobsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
