import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import VehicleSelect from "./pages/VehicleSelect";
import Dashboard from "./pages/Dashboard";
import GuidePage from "./pages/GuidePage";
import NotFound from "./pages/NotFound";
import ChatFab from "./components/ChatFab";
import { useSwipeBack } from "./hooks/use-swipe-back";

const queryClient = new QueryClient();

const ChatGate = () => {
  const { pathname } = useLocation();
  // iOS-style edge-swipe-back on every screen except the root
  useSwipeBack({ enabled: pathname !== "/" });
  if (pathname === "/") return null;
  return <ChatFab />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VehicleSelect />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
