import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import EonMark from "../components/EonMark";
import { useAuth } from "../lib/auth";
import { readCachedEonLogo } from "../lib/branding";
import { supabase } from "../lib/supabase";
import "./routes.css";

// Supabase Auth's OAuth server hands Claude's sign-in here. The teammate is
// already signed in (RequireAuth), so this only asks: let Claude act as you?
export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id");
  const { user } = useAuth();
  const [state, setState] = useState({ phase: "loading" }); // loading | ready | working | error

  useEffect(() => {
    if (!authorizationId) {
      setState({ phase: "error", message: "This link is missing its request. Start connecting again from Claude." });
      return undefined;
    }
    let stale = false;
    supabase.auth.oauth.getAuthorizationDetails(authorizationId)
      .then(({ data, error }) => {
        if (stale) return;
        if (error || !data) {
          setState({ phase: "error", message: "This request expired or was already used. Start connecting again from Claude." });
          return;
        }
        // Already approved before: Supabase answers with where to go next.
        if (!("authorization_id" in data)) {
          window.location.assign(data.redirect_url);
          return;
        }
        setState({ phase: "ready", details: data });
      })
      .catch(() => {
        if (!stale) setState({ phase: "error", message: "Couldn't reach the hub. Check your connection and try again." });
      });
    return () => { stale = true; };
  }, [authorizationId]);

  const decide = async (approve) => {
    setState((current) => ({ ...current, phase: "working", choice: approve ? "allow" : "deny" }));
    const oauth = supabase.auth.oauth;
    const { error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    // On success the browser is already on its way back to Claude.
    if (error) setState({ phase: "error", message: "That didn't go through. Start connecting again from Claude." });
  };

  const details = state.details;
  let redirectHost = "";
  try { redirectHost = details ? new URL(details.redirect_uri).host : ""; } catch { redirectHost = ""; }

  return (
    <ConsentCard
      phase={state.phase} choice={state.choice} message={state.message}
      clientName={details?.client?.name || "Claude"} email={user?.email} redirectHost={redirectHost}
      onDecide={decide}
    />
  );
}

// The card on its own, so the dev preview (?consent-preview) can show every
// state without a real OAuth request.
export function ConsentCard({ phase, choice, message, clientName, email, redirectHost, onDecide }) {
  return (
    <main className="route-shell auth-shell">
      <div className="auth-layout">
        <section className="route-card auth-card" aria-labelledby="consent-title" aria-busy={phase === "loading"}>
          <div className="auth-card-brand route-brand">
            <EonMark src={readCachedEonLogo()} className="route-brand-mark route-brand-logo" size={28} />
            <span>Eon</span>
          </div>

          {phase === "error" ? (
            <div className="route-state route-state--error" role="alert">
              <span className="route-state-icon"><AlertCircle size={18} /></span>
              <div>
                <strong id="consent-title">Couldn't connect</strong>
                <p>{message}</p>
                <p><a href="#/">Back to the hub</a></p>
              </div>
            </div>
          ) : phase === "loading" ? (
            <div className="auth-card-heading">
              <h2 id="consent-title">Connecting Claude…</h2>
              <p><Loader2 className="route-spinner" size={17} aria-hidden="true" /></p>
            </div>
          ) : (
            <>
              <div className="auth-card-heading">
                <h2 id="consent-title">Connect {clientName}?</h2>
                <p>
                  {clientName} will read and edit prototype HTML as {email}. Your team sees its edits live.
                  {redirectHost && <> It returns to <strong>{redirectHost}</strong>.</>}
                </p>
              </div>
              <div className="route-form auth-form">
                <button className="route-button route-button--primary route-button--wide route-pressable" type="button"
                  disabled={phase === "working"} onClick={() => onDecide(true)}>
                  {phase === "working" && choice === "allow" && <Loader2 className="route-spinner" size={17} aria-hidden="true" />}
                  <span>Allow</span>
                </button>
                <button className="route-button route-button--quiet route-button--wide route-pressable" type="button"
                  disabled={phase === "working"} onClick={() => onDecide(false)}>
                  <span>Deny</span>
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
