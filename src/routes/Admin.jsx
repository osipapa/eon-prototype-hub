import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listProfiles, setProfileRole } from "../lib/data";
import { ArrowLeft } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setRows(await listProfiles()); } catch (e) { console.error(e); }
  }
  useEffect(() => { load(); }, []);

  async function changeRole(id, role) {
    setBusy(true);
    try { await setProfileRole(id, role); await load(); } catch (e) { alert(e.message); }
    setBusy(false);
  }

  const bg = "#000", panel = "#121216", border = "#1E1E22", text = "#fff", muted = "#9094A5", brand = "#E15CF7";
  const th = { textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 500, color: muted };
  const td = { padding: "12px 16px", fontSize: 14, borderTop: `1px solid ${border}` };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ height: 56, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 20px" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${border}`, color: muted, borderRadius: 8, height: 32, padding: "0 12px", cursor: "pointer", fontSize: 13 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Hub
        </button>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Admin — Team members</span>
      </div>
      <div style={{ padding: 24, maxWidth: 820 }}>
        <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Member</th><th style={th}>Email</th><th style={th}>Role</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.full_name || "—"}</td>
                  <td style={{ ...td, color: muted }}>{r.email}</td>
                  <td style={td}>
                    <select value={r.role} disabled={busy || r.id === user?.id}
                      onChange={(e) => changeRole(r.id, e.target.value)}
                      style={{ background: bg, color: text, border: `1px solid ${border}`, borderRadius: 8, height: 32, padding: "0 8px" }}>
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
        <p style={{ fontSize: 12, color: muted, marginTop: 12 }}>
          Members can view and edit prototypes. Admins additionally manage roles and can delete content. New signups join as members.
        </p>
      </div>
    </div>
  );
}
