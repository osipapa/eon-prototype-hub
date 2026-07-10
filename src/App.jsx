import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Login from "./routes/Login";
import Hub from "./routes/Hub";
import Admin from "./routes/Admin";

function Splash({ children }) {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#9094A5", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
      {children}
    </div>
  );
}

function RequireAuth({ children, adminOnly }) {
  const { user, isAdmin, loading, configured } = useAuth();
  if (!configured) return <Navigate to="/login" replace />;
  if (loading) return <Splash>Loading…</Splash>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Hub /></RequireAuth>} />
        <Route path="/p/:slug" element={<RequireAuth><Hub /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth adminOnly><Admin /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
