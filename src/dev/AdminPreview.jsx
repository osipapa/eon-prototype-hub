import { HashRouter } from "react-router-dom";
import Admin from "../routes/Admin";

// Dev-only: ?admin-preview renders the admin page with mock members, so it can
// be checked and screenshotted without signing in. Nothing is saved.
// A stand-in photo, inline so the preview makes no network requests.
const PHOTO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3b3f58"/><circle cx="32" cy="25" r="11" fill="#c9cbe0"/><rect x="14" y="40" width="36" height="24" rx="12" fill="#c9cbe0"/></svg>')}`;

const MEMBERS = [
  { id: "me", email: "alex@example.com", full_name: "Alex Rivera", avatar_url: PHOTO, role: "admin", tutorial_persona: "engineer" },
  { id: "sam", email: "sam@example.com", full_name: "Sam Lee", role: "member", tutorial_persona: "designer" },
  { id: "jordan", email: "jordan@example.com", role: "member", tutorial_persona: "operations" },
  { id: "priya", email: "priya@example.com", full_name: "Priya Nair", avatar_url: "https://example.invalid/missing.png", role: "member", tutorial_persona: "operations" },
  { id: "chris", email: "chris@example.com", role: "member", tutorial_persona: "engineer" },
  { id: "morgan", email: "morgan@example.com", role: "member" },
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
