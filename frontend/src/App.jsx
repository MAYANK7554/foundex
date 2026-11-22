import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import { useAuth } from "./AuthContext.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ReportLost from "./pages/ReportLost.jsx";
import ReportFound from "./pages/ReportFound.jsx";
import MatchesFeed from "./pages/MatchesFeed.jsx";
import ItemDetail from "./pages/ItemDetail.jsx";
import MyReports from "./pages/MyReports.jsx";

function RequireAuth({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function GuestOnly({ children }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/feed" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/report/lost" element={<RequireAuth><ReportLost /></RequireAuth>} />
        <Route path="/report/found" element={<RequireAuth><ReportFound /></RequireAuth>} />
        <Route path="/feed" element={<RequireAuth><MatchesFeed /></RequireAuth>} />
        <Route path="/item/:id" element={<RequireAuth><ItemDetail /></RequireAuth>} />
        <Route path="/mine" element={<RequireAuth><MyReports /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
