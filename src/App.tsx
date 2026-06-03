import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { IdrielJobsProvider } from "@/contexts/IdrielJobsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";

import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PricingPage from "./pages/PricingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <IdrielJobsProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/inicio" element={<Navigate to="/planos" replace />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/planos" element={<PricingPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </IdrielJobsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
