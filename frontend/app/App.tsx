import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "@/contexts/SessionContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { SessionPage } from "@/pages/SessionPage";

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/sessions/:sessionId" element={<SessionPage />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
