import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import SOSPage from "./pages/SOSPage";
import AssistantPage from "./pages/AssistantPage";
import ReportPage from "./pages/ReportPage";
import RiskMapPage from "./pages/RiskMapPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/sos" element={<SOSPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/risk-map" element={<RiskMapPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
