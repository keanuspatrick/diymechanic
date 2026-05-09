import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import VehicleSelect from "./pages/VehicleSelect";
import Dashboard from "./pages/Dashboard";
import GuidePage from "./pages/GuidePage";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import ChatFab from "./components/ChatFab";
import ConsentBanner from "./components/ConsentBanner";
import { initAnalytics, trackScreen } from "./lib/analytics";

const queryClient = new QueryClient();

const ChatGate = () => {
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  return <ChatFab />;
};

const ScreenTracker = () => {
  const { pathname } = useLocation();
  useEffect(() => { trackScreen(pathname); }, [pathname]);
  return null;
};

const App = () => {
  useEffect(() => { initAnalytics(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <ScreenTracker />
          <Routes>
            <Route path="/" element={<VehicleSelect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatGate />
          <ConsentBanner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
