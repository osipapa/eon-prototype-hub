import { Component, lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import LoadingScreen from "./components/LoadingScreen";

const Login = lazy(() => import("./routes/Login"));
const Hub = lazy(() => import("./routes/Hub"));
const Design = lazy(() => import("./routes/Design"));
const Prompts = lazy(() => import("./routes/Prompts"));
const Admin = lazy(() => import("./routes/Admin"));
const Mirror = lazy(() => import("./routes/Mirror"));
const OAuthConsent = lazy(() => import("./routes/OAuthConsent"));

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
  const location = useLocation();
  // Remember where the link was going, so signing in lands there, not on Prototypes.
  const from = { from: `${location.pathname}${location.search}` };
  if (!configured) return <Navigate to="/login" replace state={from} />;
  if (loading) return <Splash>Loading…</Splash>;
  if (!user) return <Navigate to="/login" replace state={from} />;
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
            <Route path="/design" element={<RequireAuth><Design /></RequireAuth>} />
            <Route path="/design/:slug" element={<RequireAuth><Design /></RequireAuth>} />
            <Route path="/prompts" element={<RequireAuth><Prompts /></RequireAuth>} />
            <Route path="/prompts/:slug" element={<RequireAuth><Prompts /></RequireAuth>} />
            {/* Tracking moved into Eon Design; keep old links working. */}
            <Route path="/tracking/*" element={<Navigate to="/design/tracking-mixpanel" replace />} />
            <Route path="/admin" element={<RequireAuth adminOnly><Admin /></RequireAuth>} />
            <Route path="/mirror/:session" element={<RequireAuth><Mirror /></RequireAuth>} />
            <Route path="/oauth/consent" element={<RequireAuth><OAuthConsent /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </AppErrorBoundary>
  );
}
