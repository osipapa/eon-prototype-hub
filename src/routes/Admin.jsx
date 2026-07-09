import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listProfiles, setProfileRole, listInvites, sendInvite, removeInvite } from "../lib/data";
import { ArrowLeft, MailPlus, X } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteMsg, setInviteMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [profiles, inv] = await Promise.all([listProfiles(), listInvites()]);
      setRows(profiles);
      setInvites(inv);
    } catch (e) { console.error(e); }
  }
  useEffect(() => { load(); }, []);

  async function changeRole(id, role) {
    setBusy(true);
    try { await setProfileRole(id, role); await load(); } catch (e) { alert(e.message); }
    setBusy(false);
  }

  async function invite(e) {
    e.preventDefault();
    if (!inviteEmail) return;
    setBusy(true);
    setInviteMsg("");
    try {
      const res = await sendInvite(inviteEmail, inviteRole);
      setInviteMsg(res?.emailSent
        ? `Invite email sent to ${inviteEmail}.`
        : `${inviteEmail} is approved to sign up${res?.mailError ? ` (email not sent: ${res.mailError})` : ""}.`);
      setInviteEmail("");
      await load();
    } catch (err) { setInviteMsg(`Invite failed: ${err.message}`); }
    setBusy(false);
  }

  async function revoke(email) {
    setBusy(true);
    try { await removeInvite(email); await load(); } catch (e) { alert(e.message); }
    setBusy(false);
  }

  const bg = "#000", panel = "#121216", border = "#1E1E22", text = "#fff", muted = "#9094A5";
  const th = { textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 500, color: muted };
  const td = { padding: "12px 16px", fontSize: 14, borderTop: `1px solid ${border}` };
  const select = { background: bg, color: text, border: `1px solid ${border}`, borderRadius: 8, height: 32, padding: "0 8px" };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ height: 56, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 20px" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${border}`, color: muted, borderRadius: 8, height: 32, padding: "0 12px", cursor: "pointer", fontSize: 13 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Hub
        </button>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Admin — Team members</span>
      </div>
      <div style={{ padding: 24, maxWidth: 820, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Member</th><th style={th}>Email</th><th style={th}>Role</th></tr></thead>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
            <MailPlus style={{ width: 15, height: 15, color: muted }} /> Invite a teammate
          </div>
          <form onSubmit={invite} style={{ display: "flex", gap: 8 }}>
            <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com" aria-label="Invite email address"
              style={{ flex: 1, height: 36, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "0 12px", color: text, fontSize: 13 }} />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} aria-label="Invite role" style={{ ...select, height: 36 }}>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" disabled={busy}
              style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: "#EDD2F6", color: "#000", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
              Send invite
            </button>
          </form>
          {inviteMsg && <p role="status" style={{ fontSize: 12, color: muted, marginTop: 10 }}>{inviteMsg}</p>}
          {invites.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: muted }}>Pending invites</div>
              {invites.map((i) => (
                <div key={i.email} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, padding: "6px 10px" }}>
                  <span style={{ flex: 1 }}>{i.email}</span>
                  <span style={{ color: muted, fontSize: 12 }}>{i.role}</span>
                  <button onClick={() => revoke(i.email)} disabled={busy} aria-label={`Revoke invite for ${i.email}`}
                    style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 12, color: muted, marginTop: 12 }}>
            Sign-up is invite-only: accounts without an invite get no team and can't see any data.
            Members can view and edit prototypes. Admins additionally manage roles, invites, and can delete content.
          </p>
        </div>
      </div>
    </div>
  );
}
