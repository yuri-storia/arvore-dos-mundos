import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { IdrielJobsProvider } from "@/contexts/IdrielJobsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SpellcheckProvider } from "@/lib/spellcheck/SpellcheckProvider";

// Lazy-loaded pages (Sprint 1 / P0 #3: route-level code splitting)
const Index = lazy(() => import("./pages/Index"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const FundadorInvitePage = lazy(() => import("./pages/FundadorInvitePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CancelPlanPage = lazy(() => import("./pages/CancelPlanPage"));
const ManageAccountPage = lazy(() => import("./pages/ManageAccountPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ObrigadoPage = lazy(() => import("./pages/ObrigadoPage"));
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




const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <IdrielJobsProvider>
            <SpellcheckProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/inicio" element={<Navigate to="/" replace />} />
                  <Route path="/planos" element={<PricingPage />} />
                  <Route path="/fundador" element={<FundadorInvitePage />} />
                  <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/cancelar-plano" element={<ProtectedRoute><CancelPlanPage /></ProtectedRoute>} />
                  <Route path="/minha-conta" element={<ProtectedRoute><ManageAccountPage /></ProtectedRoute>} />
                  
                  
                  <Route path="/obrigado" element={<ObrigadoPage />} />
                  <Route path="/seguranca" element={<SegurancaPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SpellcheckProvider>
          </IdrielJobsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
