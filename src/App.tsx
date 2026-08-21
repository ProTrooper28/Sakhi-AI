import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider, useApp } from "@/context/AppContext";
import { EmergencyActivationProvider } from "@/components/emergency/EmergencyActivationProvider";
import VoiceSOSIndicator from "@/components/emergency/VoiceSOSIndicator";
import ShakeCountdown from "@/components/emergency/ShakeCountdown";
import { canAccess, roleHomePath } from "@/lib/auth-types";
import WelcomePage from "./pages/WelcomePage";
import AuthChoicePage from "./pages/AuthChoicePage";
import SignInPage from "./pages/SignInPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LoginPage from "./pages/LoginPage";
import ParentRegisterPage from "./pages/ParentRegisterPage";
import OtpPage from "./pages/OtpPage";
import CreatePasswordPage from "./pages/CreatePasswordPage";
import HomePage from "./pages/HomePage";
import SOSPage from "./pages/SOSPage";
import AssistantPage from "./pages/AssistantPage";
import ReportPage from "./pages/ReportPage";
import ReportReviewPage from "./pages/ReportReviewPage";
import MyReportsPage from "./pages/MyReportsPage";
import EvidenceLockerPage from "./pages/EvidenceLockerPage";
import GuardianEvidenceLockerPage from "./pages/guardian/GuardianEvidenceLockerPage";
import RiskMapPage from "./pages/RiskMapPage";
import GuardianPage from "./pages/GuardianPage";
import GuardiansPage from "./pages/GuardiansPage";
import WearableDemoPage from "./pages/WearableDemoPage";
import Watch3DPage from "./pages/Watch3DPage";
import UserLiveLocationPage from "./pages/location/UserLiveLocationPage";
import GuardianTrackingPage from "./pages/location/GuardianTrackingPage";
import SecuritySettingsPage from "./pages/SecuritySettingsPage";
import SafetyJourneyPage from "./pages/SafetyJourneyPage";
import PostIncidentPage from "./pages/PostIncidentPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Route guard: only lets authenticated users or guests through. Signed-out
 * visitors are sent back to the role-selection welcome screen.
 */
/**
 * Keeps the two apps separate after login:
 *
 *   /guardian   → the Parent/Guardian monitoring app (role must be "parent")
 *   /guardians  → the user app's Guardian Management (role must be "user";
 *                 admins may use it too — admin uses the user app)
 *
 * Guests keep demo access to either; signed-in users are bounced to a route
 * they can actually open (their own app's home or the user-app counterpart),
 * so the two role guards can never ping-pong each other.
 *   role === null means the profile is still loading — wait for it.
 */
const RoleGuard = ({
  expected,
  children,
}: {
  expected: "user" | "parent";
  children: ReactNode;
}) => {
  const { ready, role, guest } = useAuth();
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
  if (!guest && role !== null && !canAccess(role, expected)) {
    // Never bounce to the other role-guard's route (that loops). Go to the
    // user-app counterpart (user → their Guardian Management) or, for any
    // other role (e.g. admin), to that role's home.
    const fallback =
      expected === "parent" && role === "user" ? "/guardians" : roleHomePath(role);
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

const Protected = ({ children }: { children: ReactNode }) => {
  const { ready, user, guest } = useAuth();
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
  if (!user && !guest) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/**
 * Wraps the app with EmergencyActivationProvider once the AppContext
 * (which owns triggerSOS) is available. Renders the global overlays
 * (voice indicator + shake countdown) that must live outside routes.
 */
const EmergencyShell = ({ children }: { children: ReactNode }) => {
  const { triggerSOS } = useApp();
  return (
    <EmergencyActivationProvider triggerSOS={triggerSOS}>
      <VoiceSOSIndicator />
      <ShakeCountdown />
      {children}
    </EmergencyActivationProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <EmergencyShell>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
          <BrowserRouter>
            <Routes>
              {/* ── Auth flow ── */}
              <Route path="/" element={<WelcomePage />} />
              {/* Welcome Back — Sign In vs Create Account (role from state) */}
              <Route path="/auth" element={<AuthChoicePage />} />
              {/* Sign In — email + password (existing accounts, no OTP) */}
              <Route path="/signin" element={<SignInPage />} />
              {/* Password recovery — Supabase reset link flow */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {/* Create Account — guided registration (name → phone → email → OTP → password) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<ParentRegisterPage />} />
              <Route path="/otp" element={<OtpPage />} />
              {/* Create Account step 3: password (account created at OTP verify). */}
              <Route path="/create-password" element={<CreatePasswordPage />} />

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
              {/* Guardian monitoring app — parents only. Users are sent to their
                  own Guardian Management page (/guardians). */}
              <Route
                path="/guardian"
                element={
                  <Protected>
                    <RoleGuard expected="parent">
                      <GuardianPage />
                    </RoleGuard>
                  </Protected>
                }
              />
              {/* User app — Guardian Management (invite code, accept/reject).
                  Parents are sent back to their monitoring dashboard. */}
              <Route
                path="/guardians"
                element={
                  <Protected>
                    <RoleGuard expected="user">
                      <GuardiansPage />
                    </RoleGuard>
                  </Protected>
                }
              />
              {/* Sakhi AI Smart Safety Watch — photorealistic 3D product showcase.
                  /wearable opens this directly (the Sidebar's "Wearable Device"). */}
              <Route
                path="/wearable"
                element={
                  <Protected>
                    <Watch3DPage />
                  </Protected>
                }
              />
              {/* Interactive watch-face SOS simulation (reached from the 3D page) */}
              <Route
                path="/wearable-demo"
                element={
                  <Protected>
                    <WearableDemoPage />
                  </Protected>
                }
              />
              {/* Live Location — user app: premium full-screen tracking map
                  with bottom sheet, quick actions and location history. */}
              <Route
                path="/location"
                element={
                  <Protected>
                    <UserLiveLocationPage />
                  </Protected>
                }
              />
              {/* Guardian Live Tracking — parents only: premium per-member
                  tracking screen (/guardian/live picks the first linked
                  member; /guardian/track/:userId targets one member). */}
              <Route
                path="/guardian/live"
                element={
                  <Protected>
                    <RoleGuard expected="parent">
                      <GuardianTrackingPage />
                    </RoleGuard>
                  </Protected>
                }
              />
              <Route
                path="/guardian/track/:userId"
                element={
                  <Protected>
                    <RoleGuard expected="parent">
                      <GuardianTrackingPage />
                    </RoleGuard>
                  </Protected>
                }
              />
              <Route
                path="/guardian/evidence-locker"
                element={
                  <Protected>
                    <RoleGuard expected="parent">
                      <GuardianEvidenceLockerPage />
                    </RoleGuard>
                  </Protected>
                }
              />
              {/* Safety Journey — proactive route monitoring with deviation
                  detection, ETA, guardian tracking and AI insights. */}
              <Route
                path="/journey"
                element={
                  <Protected>
                    <SafetyJourneyPage />
                  </Protected>
                }
              />
              {/* Post-Incident Support — guided recovery checklist after an
                  incident (evidence, guardian, helplines, report). */}
              <Route
                path="/post-incident"
                element={
                  <Protected>
                    <PostIncidentPage />
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
        </EmergencyShell>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
