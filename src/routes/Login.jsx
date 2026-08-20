import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { cacheEonLogo, readCachedEonLogo, safeBrandLogoUrl } from "../lib/branding";
import { getPublicEonLogo } from "../lib/data";
import "./routes.css";

function EonMark({ src }) {
  const [failed, setFailed] = useState(false);
  const safeSrc = safeBrandLogoUrl(src);

  useEffect(() => setFailed(false), [safeSrc]);

  if (safeSrc && !failed) {
    return <img className="route-brand-mark route-brand-logo" src={safeSrc} alt="Eon" onError={() => setFailed(true)} />;
  }

  return (
    <svg className="route-brand-mark" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="eon-login-accent" x1="5" y1="4" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DD0EFF" />
          <stop offset="1" stopColor="#F19DFF" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 4 A8 8 0 0 1 12 20" stroke="url(#eon-login-accent)" strokeWidth="2" />
    </svg>
  );
}

function PasswordVisibilityIcon({ visible }) {
  return (
    <span className="route-visibility-icon" aria-hidden="true">
      <EyeOff className={`route-visibility-glyph ${visible ? "is-visible" : "is-hidden"}`} size={17} />
      <Eye className={`route-visibility-glyph ${visible ? "is-hidden" : "is-visible"}`} size={17} />
    </span>
  );
}

export default function Login() {
  const { user, configured, signInWithPassword } = useAuth();
  const [logoUrl, setLogoUrl] = useState(readCachedEonLogo);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!configured) return undefined;
    let active = true;
    getPublicEonLogo().then((url) => {
      if (!active) return;
      setLogoUrl(cacheEonLogo(url));
    }).catch(() => {
      // Keep the cached logo or fallback mark when branding is temporarily unavailable.
    });
    return () => { active = false; };
  }, [configured]);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        setErr(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message);
      }
    } catch (error) {
      setErr(error.message || "We couldn't sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="route-shell auth-shell">
      <div className="auth-layout">
        <section className="route-card auth-card" aria-labelledby="login-title">
          <div className="auth-card-brand route-brand">
            <EonMark src={logoUrl} />
            <span>Eon</span>
          </div>
          <div className="auth-card-heading">
            <h2 id="login-title">Welcome back</h2>
            <p>Sign in to open your team's shared design workspace.</p>
          </div>

          {!configured ? (
            <div className="route-state route-state--error" role="alert">
              <span className="route-state-icon"><AlertCircle size={18} /></span>
              <div>
                <strong>Workspace isn't configured</strong>
                <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to the environment, then reload.</p>
              </div>
            </div>
          ) : (
            <form className="route-form auth-form" onSubmit={submit} noValidate={false}>
              <div className="route-field">
                <label htmlFor="login-email">Email address</label>
                <input id="login-email" className="route-input" type="email" required autoComplete="email"
                  inputMode="email" placeholder="you@company.com" value={email}
                  aria-describedby={err ? "login-error" : undefined}
                  onChange={(event) => setEmail(event.target.value)} />
              </div>

              <div className="route-field">
                <label htmlFor="login-password">Password</label>
                <div className="route-input-wrap">
                  <input id="login-password" className="route-input route-input--with-action"
                    type={showPassword ? "text" : "password"} required autoComplete="current-password"
                    placeholder="Enter your password" value={password}
                    aria-describedby={err ? "login-error" : undefined}
                    onChange={(event) => setPassword(event.target.value)} />
                  <button className="route-input-action route-pressable" type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}>
                    <PasswordVisibilityIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              {err && (
                <div id="login-error" className="route-inline-error" role="alert">
                  <AlertCircle size={15} aria-hidden="true" />
                  <span>{err}</span>
                </div>
              )}

              <button className="route-button route-button--primary route-button--wide route-pressable" type="submit" disabled={busy}>
                {busy && <Loader2 className="route-spinner" size={17} aria-hidden="true" />}
                <span>{busy ? "Signing in…" : "Sign in"}</span>
              </button>
            </form>
          )}

          {configured && (
            <p className="auth-help">Need access? Ask a workspace admin to create your account.</p>
          )}
        </section>
      </div>
    </main>
  );
}
