import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listProfiles, setProfileRole, createAccount, setAccountPassword, deleteAccount } from "../lib/data";
import { ArrowLeft, UserPlus, KeyRound, Trash2 } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ email: "", password: "", role: "member" });

  async function load() {
    try { setRows(await listProfiles()); } catch (e) { console.error(e); }
  }
  useEffect(() => { load(); }, []);

  const run = async (fn, okMsg) => {
    setBusy(true);
    setMsg("");
    try { await fn(); setMsg(okMsg); await load(); } catch (e) { setMsg(`Error: ${e.message}`); }
    setBusy(false);
  };

  const changeRole = (id, role) => run(() => setProfileRole(id, role), "Role updated.");

  const addAccount = (e) => {
    e.preventDefault();
    run(async () => {
      await createAccount(form.email, form.password, form.role);
      setForm({ email: "", password: "", role: "member" });
    }, `Account created for ${form.email}.`);
  };

  const resetPassword = (r) => {
    const pw = window.prompt(`New password for ${r.email} (min 8 characters):`);
    if (!pw) return;
    run(() => setAccountPassword(r.id, pw), `Password updated for ${r.email}.`);
  };

  const removeAccount = (r) => {
    if (!window.confirm(`Delete the account ${r.email}? This can't be undone.`)) return;
    run(() => deleteAccount(r.id), `Deleted ${r.email}.`);
  };

  const bg = "#000", panel = "#121216", border = "#1E1E22", text = "#fff", muted = "#9094A5";
  const th = { textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 500, color: muted };
  const td = { padding: "12px 16px", fontSize: 14, borderTop: `1px solid ${border}` };
  const select = { background: bg, color: text, border: `1px solid ${border}`, borderRadius: 8, height: 32, padding: "0 8px" };
  const input = { height: 36, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "0 12px", color: text, fontSize: 13 };
  const iconBtn = { width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ height: 56, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 20px" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${border}`, color: muted, borderRadius: 8, height: 32, padding: "0 12px", cursor: "pointer", fontSize: 13 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Hub
        </button>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Admin — Team members</span>
      </div>
      <div style={{ padding: 24, maxWidth: 860, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Member</th><th style={th}>Email</th><th style={th}>Role</th><th style={th}>Account</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.full_name || "—"}</td>
                  <td style={{ ...td, color: muted }}>{r.email}</td>
                  <td style={td}>
                    <select value={r.role} disabled={busy || r.id === user?.id} aria-label={`Role for ${r.email}`}
                      onChange={(e) => changeRole(r.id, e.target.value)} style={select}>
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                    {r.id === user?.id && <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>you</span>}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => resetPassword(r)} disabled={busy} title="Set password"
                        aria-label={`Set password for ${r.email}`} style={iconBtn}>
                        <KeyRound style={{ width: 14, height: 14 }} />
                      </button>
                      {r.id !== user?.id && (
                        <button onClick={() => removeAccount(r)} disabled={busy} title="Delete account"
                          aria-label={`Delete account ${r.email}`} style={iconBtn}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
            <UserPlus style={{ width: 15, height: 15, color: muted }} /> Add account
          </div>
          <form onSubmit={addAccount} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="email" required value={form.email} placeholder="teammate@company.com"
              aria-label="New account email" autoComplete="off"
              onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ ...input, flex: 2, minWidth: 220 }} />
            <input type="text" required minLength={8} value={form.password} placeholder="Password (min 8 chars)"
              aria-label="New account password" autoComplete="off"
              onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ ...input, flex: 1.4, minWidth: 180 }} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              aria-label="New account role" style={{ ...select, height: 36 }}>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" disabled={busy}
              style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: "#EDD2F6", color: "#000", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
              Create account
            </button>
          </form>
          {msg && <p role="status" style={{ fontSize: 12, color: msg.startsWith("Error") ? "#FF508F" : muted, marginTop: 10 }}>{msg}</p>}
          <p style={{ fontSize: 12, color: muted, marginTop: 12 }}>
            There is no self-signup: you create accounts here and hand teammates their password.
            Use the key button to set a new password, the trash button to delete an account.
            Members can view and edit prototypes; admins additionally manage accounts, roles, and can delete content.
          </p>
        </div>
      </div>
    </div>
  );
}
