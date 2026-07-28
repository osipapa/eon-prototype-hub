import { Component, lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import LoadingScreen from "./components/LoadingScreen";

const Login = lazy(() => import("./routes/Login"));
const Hub = lazy(() => import("./routes/Hub"));
const Prompts = lazy(() => import("./routes/Prompts"));
const Tracking = lazy(() => import("./routes/Tracking"));
const Admin = lazy(() => import("./routes/Admin"));

function Splash({ children }) {
  return <LoadingScreen>{children}</LoadingScreen>;
}

class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="eon-app-error" role="alert">
        <div>
          <span>Something went wrong</span>
          <p>The hub hit an unexpected error. Your saved team data is unaffected.</p>
          <button onClick={() => window.location.reload()}>Reload the hub</button>
        </div>
      </div>
    );
  }
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
    <AppErrorBoundary>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Splash>Loading Eon…</Splash>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Hub /></RequireAuth>} />
            <Route path="/p/:slug" element={<RequireAuth><Hub /></RequireAuth>} />
            <Route path="/prompts" element={<RequireAuth><Prompts /></RequireAuth>} />
            <Route path="/prompts/:slug" element={<RequireAuth><Prompts /></RequireAuth>} />
            <Route path="/tracking" element={<RequireAuth><Tracking /></RequireAuth>} />
            <Route path="/tracking/:slug" element={<RequireAuth><Tracking /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth adminOnly><Admin /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </AppErrorBoundary>
  );
}
