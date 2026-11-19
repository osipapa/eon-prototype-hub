import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { redeemMirrorHandoff } from "./lib/mirror";
import LoadingScreen from "./components/LoadingScreen";
import { useLoaderHold } from "./lib/loaderClock";

const routeLoaders = {
  login: () => import("./routes/Login"),
  hub: () => import("./routes/Hub"),
  design: () => import("./routes/Design"),
  prompts: () => import("./routes/Prompts"),
  admin: () => import("./routes/Admin"),
  mirror: () => import("./routes/Mirror"),
  full: () => import("./routes/Full"),
  oauth: () => import("./routes/OAuthConsent"),
  animations: () => import("./routes/Animations"),
};
const Login = lazy(routeLoaders.login);
const Hub = lazy(routeLoaders.hub);
const Design = lazy(routeLoaders.design);
const Prompts = lazy(routeLoaders.prompts);
const Admin = lazy(routeLoaders.admin);
const Mirror = lazy(routeLoaders.mirror);
const Full = lazy(routeLoaders.full);
const OAuthConsent = lazy(routeLoaders.oauth);
const Animations = lazy(routeLoaders.animations);

// Start downloading the page this link opens right away, while the session is
// still being checked, instead of after. Only with a stored session: a signed-
// out visitor is headed for the sign-in page.
function preloadOpeningRoute() {
  try {
    const signedIn = Object.keys(window.localStorage).some((key) => /^sb-.+-auth-token$/.test(key));
    const first = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
    const name = first === "" || first === "p" ? "hub" : first;
    const load = signedIn ? routeLoaders[name] || routeLoaders.hub : routeLoaders.login;
    load().catch(() => {});
  } catch {
    // Storage blocked: the route loads when it renders, as before.
  }
}
preloadOpeningRoute();

function Splash({ children }) {
  return <LoadingScreen>{children}</LoadingScreen>;
}

// Once a loading screen has shown, keep one over the page until its sequence
// is complete, so a fast load never cuts the mark off half-built. It then
// fades out; the page underneath is already there.
function LoaderHold() {
  const holding = useLoaderHold();
  const [mounted, setMounted] = useState(holding);
  useEffect(() => {
    if (holding) {
      setMounted(true);
      return undefined;
    }
    const id = window.setTimeout(() => setMounted(false), 240);
    return () => window.clearTimeout(id);
  }, [holding]);
  if (!holding && !mounted) return null;
  return (
    <div className={`eon-loading-hold${holding ? "" : " is-leaving"}`}>
      <LoadingScreen />
    </div>
  );
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

/* The phone mirror's QR carries a one-time sign-in token (?t=), so a phone
   that isn't signed in lands on the prototype instead of a password form.
   Redeemed once, then dropped from the URL; a used or expired token falls
   through to the normal sign-in. A phone already signed in keeps its account. */
function MirrorHandoff({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const token = params.get("t");
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    if (!token || loading) return;
    if (user || failed) {
      params.delete("t");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
      return;
    }
    if (tried.current) return;
    tried.current = true;
    redeemMirrorHandoff(token).then((ok) => { if (!ok) setFailed(true); });
  }, [token, loading, user, failed]);

  if (token) return <Splash>Signing you in…</Splash>;
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
            <Route path="/animations/:slug" element={<RequireAuth><Animations /></RequireAuth>} />
            <Route path="/animations/:slug/:animationId" element={<RequireAuth><Animations /></RequireAuth>} />
            <Route path="/design" element={<RequireAuth><Design /></RequireAuth>} />
            <Route path="/design/:slug" element={<RequireAuth><Design /></RequireAuth>} />
            <Route path="/prompts" element={<RequireAuth><Prompts /></RequireAuth>} />
            <Route path="/prompts/:slug" element={<RequireAuth><Prompts /></RequireAuth>} />
            {/* Tracking moved into Eon Design; keep old links working. */}
            <Route path="/tracking/*" element={<Navigate to="/design/tracking-mixpanel" replace />} />
            <Route path="/admin" element={<RequireAuth adminOnly><Admin /></RequireAuth>} />
            <Route path="/mirror/:session" element={<MirrorHandoff><RequireAuth><Mirror /></RequireAuth></MirrorHandoff>} />
            <Route path="/full/:slug" element={<RequireAuth><Full /></RequireAuth>} />
            <Route path="/oauth/consent" element={<RequireAuth><OAuthConsent /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <LoaderHold />
      </HashRouter>
    </AppErrorBoundary>
  );
}
