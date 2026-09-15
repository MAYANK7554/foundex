import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import AdminDashboard from "./pages/AdminDashboard.jsx";

function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/feed" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/report/lost" element={<RequireAuth><ReportLost /></RequireAuth>} />
        <Route path="/report/found" element={<RequireAuth><ReportFound /></RequireAuth>} />
        <Route path="/feed" element={<RequireAuth><MatchesFeed /></RequireAuth>} />
        <Route path="/item/:id" element={<RequireAuth><ItemDetail /></RequireAuth>} />
        <Route path="/mine" element={<RequireAuth><MyReports /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
