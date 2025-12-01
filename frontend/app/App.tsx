import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "@/contexts/SessionContext";
import { ExecutionProvider } from "@/contexts/ExecutionContext";
import { MobileNavProvider } from "@/contexts/MobileNavContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { SessionPage } from "@/pages/SessionPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <ExecutionProvider>
            <MobileNavProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/sessions/:sessionId" element={<SessionPage />} />
                </Route>
              </Routes>
              <Toaster />
            </MobileNavProvider>
          </ExecutionProvider>
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
