import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { user, configured, signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const { error } = await signInWithEmail(email);
    if (error) setErr(error.message);
    else setSent(true);
  };

  const wrap = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#fff", fontFamily: "'DM Sans',sans-serif", padding: 24 };
  const card = { width: "100%", maxWidth: 380, background: "#121216", border: "1px solid #1E1E22", borderRadius: 16, padding: 28 };
  const input = { width: "100%", height: 44, background: "#000", border: "1px solid #3A3D4A", borderRadius: 8, padding: "0 14px", color: "#fff", fontSize: 15, marginBottom: 12 };
  const primary = { width: "100%", height: 44, background: "#EDD2F6", color: "#000", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer" };
  const ghost = { width: "100%", height: 44, background: "transparent", color: "#fff", border: "1px solid #1E1E22", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer", marginTop: 8 };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 22 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /><path d="M12 4 A8 8 0 0 1 12 20" stroke="#E15CF7" strokeWidth="2" /></svg>
          <span style={{ fontSize: 18, fontWeight: 500 }}>Eon Prototype Hub</span>
        </div>
        {!configured ? (
          <p style={{ fontSize: 13, color: "#9094A5", textAlign: "center", lineHeight: 1.5 }}>
            Supabase isn't configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env, then reload.
          </p>
        ) : sent ? (
          <p style={{ fontSize: 14, color: "#9094A5", textAlign: "center", lineHeight: 1.6 }}>
            Check your email for a magic link to sign in.
          </p>
        ) : (
          <form onSubmit={submit}>
            <p style={{ fontSize: 13, color: "#9094A5", textAlign: "center", marginBottom: 18 }}>Sign in to view your team's prototypes.</p>
            <input style={input} type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {err && <div style={{ color: "#FF508F", fontSize: 12, marginBottom: 10 }}>{err}</div>}
            <button style={primary} type="submit">Email me a magic link</button>
            <button style={ghost} type="button" onClick={signInWithGoogle}>Continue with Google</button>
          </form>
        )}
      </div>
    </div>
  );
}
