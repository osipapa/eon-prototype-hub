import { HashRouter } from "react-router-dom";
import Admin from "../routes/Admin";

// Dev-only: ?admin-preview renders the admin page with mock members, so it can
// be checked and screenshotted without signing in. Nothing is saved.
const MEMBERS = [
  { id: "me", email: "mate@eonrides.com", role: "admin", tutorial_persona: "engineer" },
  { id: "vy", email: "vy@eonrides.com", role: "member", tutorial_persona: "designer" },
  { id: "derrick", email: "derrick@eonrides.com", role: "member", tutorial_persona: "operations" },
  { id: "rei", email: "rei@eonrides.com", full_name: "Rei Tanaka", role: "member", tutorial_persona: "operations" },
  { id: "michael", email: "michael@eonrides.com", role: "member", tutorial_persona: "engineer" },
  { id: "paul", email: "paul@eonrides.com", role: "member" },
];

let rows = MEMBERS;
const wait = () => new Promise((resolve) => setTimeout(resolve, 250));
const api = {
  listProfiles: async () => { await wait(); return rows; },
  createAccount: async (email, _password, role) => { await wait(); rows = [...rows, { id: email, email, role }]; },
  deleteAccount: async (id) => { await wait(); rows = rows.filter((row) => row.id !== id); },
  requestProfileTutorial: async () => { await wait(); },
  setAccountPassword: async () => { await wait(); },
  setProfileRole: async (id, role) => { await wait(); rows = rows.map((row) => (row.id === id ? { ...row, role } : row)); },
};

export default function AdminPreview() {
  return (
    <HashRouter>
      <Admin api={api} auth={{ user: { id: "me" }, refreshProfile: async () => {} }} />
    </HashRouter>
  );
}
