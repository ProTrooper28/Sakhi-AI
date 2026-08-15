import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import WelcomePage from "./pages/WelcomePage";
import AuthChoicePage from "./pages/AuthChoicePage";
import SignInPage from "./pages/SignInPage";
import LoginPage from "./pages/LoginPage";
import ParentRegisterPage from "./pages/ParentRegisterPage";
import OtpPage from "./pages/OtpPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import HomePage from "./pages/HomePage";
import SOSPage from "./pages/SOSPage";
import AssistantPage from "./pages/AssistantPage";
import ReportPage from "./pages/ReportPage";
import ReportReviewPage from "./pages/ReportReviewPage";
import MyReportsPage from "./pages/MyReportsPage";
import EvidenceLockerPage from "./pages/EvidenceLockerPage";
import RiskMapPage from "./pages/RiskMapPage";
import GuardianPage from "./pages/GuardianPage";
import WearableDemoPage from "./pages/WearableDemoPage";
import LocationTrackingPage from "./pages/LocationTrackingPage";
import SecuritySettingsPage from "./pages/SecuritySettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Route guard: only lets authenticated users or guests through. Signed-out
 * visitors are sent back to the role-selection welcome screen.
 */
const Protected = ({ children }: { children: ReactNode }) => {
  const { ready, user, guest, needsProfileCompletion } = useAuth();
  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--sakhi-cream)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="dot-teal" />
      </div>
    );
  }
  // Signed-in users who never finished first-login profile completion are
  // sent to that screen before they can use the app.
  if (user && needsProfileCompletion) return <Navigate to="/complete-profile" replace />;
  if (!user && !guest) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* ── Auth flow ── */}
              <Route path="/" element={<WelcomePage />} />
              {/* Welcome Back — Sign In vs Create Account (role from state) */}
              <Route path="/auth" element={<AuthChoicePage />} />
              {/* Sign In — email-only OTP (existing accounts) */}
              <Route path="/signin" element={<SignInPage />} />
              {/* Create Account — guided registration (name → phone → email → OTP) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<ParentRegisterPage />} />
              <Route path="/otp" element={<OtpPage />} />
              {/* First-login only: email + Aadhaar (last 4) + optional password. */}
              <Route path="/complete-profile" element={<CompleteProfilePage />} />

              {/* ── App (authenticated or guest) ── */}
              <Route
                path="/home"
                element={
                  <Protected>
                    <HomePage />
                  </Protected>
                }
              />
              <Route
                path="/sos"
                element={
                  <Protected>
                    <SOSPage />
                  </Protected>
                }
              />
              <Route
                path="/assistant"
                element={
                  <Protected>
                    <AssistantPage />
                  </Protected>
                }
              />
              <Route
                path="/report"
                element={
                  <Protected>
                    <ReportPage />
                  </Protected>
                }
              />
              <Route
                path="/report-review/:id"
                element={
                  <Protected>
                    <ReportReviewPage />
                  </Protected>
                }
              />
              <Route
                path="/my-reports"
                element={
                  <Protected>
                    <MyReportsPage />
                  </Protected>
                }
              />
              <Route
                path="/evidence-locker"
                element={
                  <Protected>
                    <EvidenceLockerPage />
                  </Protected>
                }
              />
              <Route
                path="/risk-map"
                element={
                  <Protected>
                    <RiskMapPage />
                  </Protected>
                }
              />
              <Route
                path="/guardian-live"
                element={
                  <Protected>
                    <GuardianPage />
                  </Protected>
                }
              />
              <Route
                path="/guardian"
                element={
                  <Protected>
                    <GuardianPage />
                  </Protected>
                }
              />
              <Route
                path="/wearable"
                element={
                  <Protected>
                    <WearableDemoPage />
                  </Protected>
                }
              />
              <Route
                path="/location"
                element={
                  <Protected>
                    <LocationTrackingPage />
                  </Protected>
                }
              />
              <Route
                path="/settings"
                element={
                  <Protected>
                    <SecuritySettingsPage />
                  </Protected>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
