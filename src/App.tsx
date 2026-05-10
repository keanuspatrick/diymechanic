import { lazy, Suspense, useEffect, memo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import VehicleSelect from "./pages/VehicleSelect";
import { initAnalytics, trackScreen } from "./lib/analytics";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ChatFab = lazy(() => import("./components/ChatFab"));
const ConsentBanner = lazy(() => import("./components/ConsentBanner"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const ChatGate = memo(() => {
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  return (
    <Suspense fallback={null}>
      <ChatFab />
    </Suspense>
  );
});

const ScreenTracker = () => {
  const { pathname } = useLocation();
  useEffect(() => { trackScreen(pathname); }, [pathname]);
  return null;
};

const App = () => {
  useEffect(() => { initAnalytics(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <ScreenTracker />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<VehicleSelect />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <ChatGate />
          <Suspense fallback={null}>
            <ConsentBanner />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
