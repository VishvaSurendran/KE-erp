import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Layers, Users } from "lucide-react";
import { Toaster } from "react-hot-toast";
import "./App.css";
import LeadManagement from "./pages/LeadManagement";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      {/* ── Top Navigation Bar ── */}
      <nav className="app-nav">
        <NavLink to="/leads" className="brand">
          <Layers size={20} /> ERP<span>Suite</span>
        </NavLink>
        <div className="nav-links">
          <NavLink
            to="/leads"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Users size={16} /> Leads
          </NavLink>
        </div>
      </nav>

      {/* ── Page Routes ── */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/leads" replace />} />
          <Route path="/leads" element={<LeadManagement />} />
          {/* Add more routes here as the ERP grows */}
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
