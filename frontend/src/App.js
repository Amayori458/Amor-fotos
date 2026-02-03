import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import KioskHome from "@/pages/KioskHome";
import KioskSession from "@/pages/KioskSession";
import MobileUpload from "@/pages/MobileUpload";
import Admin from "@/pages/Admin";
import PrintOrder from "@/pages/PrintOrder";

function App() {
  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<KioskHome />} />
          <Route path="/kiosk/session/:sessionId" element={<KioskSession />} />
          <Route path="/upload/:sessionId" element={<MobileUpload />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/print/:orderNumber" element={<PrintOrder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
