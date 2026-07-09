#!/usr/bin/env node
// One-command onboarding for a teammate cloning this repo.
// Writes a working .env pointed at the shared Supabase project, then installs
// dependencies. Safe to commit: the anon key is the PUBLIC key (it already ships
// in the deployed site's JS bundle and is protected by row-level security).
// Run: npm run setup
import { writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

const ENV = `# Shared Eon Prototype Hub backend. Public anon key only (RLS-protected).
VITE_SUPABASE_URL=https://ytysycblrxehxebgctbk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eXN5Y2JscnhlaHhlYmdjdGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTE1NjUsImV4cCI6MjA5OTE4NzU2NX0.zmwLdN5I5id6yQyopWINGfuZvMKorAGye2wMnpdbPaU
VITE_BASE=/eon-prototype-hub/
`;

if (existsSync(envPath)) {
  console.log("• .env already exists — leaving it untouched.");
} else {
  writeFileSync(envPath, ENV);
  console.log("• Wrote .env (shared Supabase backend).");
}

console.log("• Installing dependencies…");
execSync("npm install", { cwd: root, stdio: "inherit" });

console.log("\n✓ Ready. Start the app with:  npm run dev");
console.log("  Then sign in with the email + password an admin created for you.");
console.log("  No account yet? Ask an admin to add you at the app's /admin page.");
