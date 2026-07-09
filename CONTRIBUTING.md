# Contributing — connect and push from your own Claude Code session

This is a shared team hub. Everyone works against the **same** Supabase backend
(the same prototypes, media, and accounts), and the site auto-deploys to GitHub
Pages when changes land on `main`. Here's how to get connected and ship a change.

Live app: **https://osipapa.github.io/eon-prototype-hub/**
Repo: **https://github.com/osipapa/eon-prototype-hub**

## 1. Get access (one-time, from an admin)

Ask a current admin for two things:

- **A hub account** — an admin creates it for you at the app's `/admin` page
  (Add account → your email + a password). There is no self-signup. You'll use
  that email + password to sign in to the live app and your local copy.
- **Repo write access** — the repo owner adds you as a collaborator at
  `https://github.com/osipapa/eon-prototype-hub/settings/access`. (No access?
  You can still fork the repo and open pull requests instead — see step 5.)

## 2. Clone and open in Claude Code

```bash
git clone https://github.com/osipapa/eon-prototype-hub.git
cd eon-prototype-hub
claude            # or open the folder in the Claude Code app / IDE extension
```

Claude Code reads `CLAUDE.md` (project overview) and this file automatically.

## 3. One-command setup

```bash
npm run setup
```

This writes a `.env` pointed at the shared Supabase backend and installs
dependencies. The only Supabase value in the client is the **public anon key**
(it already ships in the deployed bundle and is protected by row-level security),
so there's no secret to request — the script has what it needs.

## 4. Run it

```bash
npm run dev      # → http://localhost:5173/eon-prototype-hub/
```

Sign in with the email + password your admin created. You'll see the same
prototypes as everyone else; edits you make (notes, links, uploaded HTML, media)
save to Supabase and appear live for teammates via realtime.

## 5. Make a change and push it

The site deploys from `main`, so don't commit straight to it. Branch, push, PR:

```bash
git checkout -b your-name/short-description
# ...make changes (or let Claude Code make them)...
git add -A
git commit -m "Describe the change"
git push -u origin your-name/short-description
gh pr create --fill      # opens a pull request
```

When the PR merges to `main`, the GitHub Actions workflow
(`.github/workflows/deploy.yml`) builds and redeploys the live site
automatically — usually within a minute or two.

**Forking instead of collaborator access:** `gh repo fork --clone`, push to your
fork, then `gh pr create` against `osipapa/eon-prototype-hub`.

## Guardrails

- Only the **public anon key** belongs in the client. Never add the Supabase
  `service_role` key or any private token to the repo or `.env`. `.env` is
  gitignored regardless.
- All data access is enforced by row-level security (RLS). Don't disable it.
  Test with a **member** account, not just an admin, when changing access rules.
- Keep the Eon palette in `src/index.css` and DM Sans as the app font.
- Schema and edge functions live in `supabase/`. Changing the database means
  updating `supabase/schema.sql` and applying it to the shared project — coordinate
  with an admin before running migrations against shared data.

## Where things live

- `src/routes/` — Login, Hub, Admin pages
- `src/features/hub/PrototypeHub.jsx` — the main hub UI (canvas, controls, links)
- `src/features/hub/prototypes.js` — built-in prototype builders, palette, render
- `src/lib/` — Supabase client, auth context, data access helpers
- `supabase/schema.sql` — tables, RLS, triggers; `supabase/functions/` — edge functions
