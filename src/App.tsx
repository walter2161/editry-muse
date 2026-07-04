import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PropertyPostGenerator from "./pages/PropertyPostGenerator";
import VideoEditor from "./pages/VideoEditor";
import BufferSettings from "./pages/BufferSettings";
import NotFound from "./pages/NotFound";
import { AutomationOverlay } from "./components/editor/AutomationOverlay";
import { DebugConsole } from "./components/DebugConsole";
import { installGlobalErrorCapture } from "./store/errorLogStore";

installGlobalErrorCapture();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PropertyPostGenerator />} />
          <Route path="/editor" element={<VideoEditor />} />
          <Route path="/settings/buffer" element={<BufferSettings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AutomationOverlay />
        <DebugConsole />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
