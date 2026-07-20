# CLAUDE.md — Eon Prototype Hub

> **STATUS: already built, deployed, and live.** The app runs against a shared Supabase
> project and auto-deploys to GitHub Pages from `main`
> (https://osipapa.github.io/eon-prototype-hub/). The from-scratch build steps below are
> **complete** — do not re-run them.
>
> **Joining the team?** Read [CONTRIBUTING.md](CONTRIBUTING.md) and run `npm run setup`.
> That connects you to the shared backend and installs everything in one command.

---

The following is the original build brief, kept for reference.

This repo is a scaffold. Your job is to install dependencies, generate the shadcn/ui
components, wire up Supabase, run it locally, and deploy to GitHub Pages. Everything
must be functional and shared across the team via Supabase. Work top to bottom.

## What this app is

A Storybook-style hub for hosting interactive HTML prototypes. Team members sign in
(Supabase Auth), browse prototypes in a sidebar, view them in a device-switching
canvas with independent hub/prototype themes, edit Figma/Linear links and notes
(persisted to Supabase, shared live), manage a shared media library, and — for admins —
manage member roles. Static frontend on GitHub Pages; Supabase is the only backend.

## Stack

Vite + React 18, React Router (HashRouter), Tailwind + shadcn/ui, lucide-react,
@supabase/supabase-js. No server code.

## Step 1 — install + generate shadcn components

The scaffold imports shadcn components from `@/components/ui/*` but the generated
files are not included. Create them:

```bash
npm install
npx shadcn@latest add button badge input textarea tabs
```

`components.json`, `tailwind.config.js`, `src/index.css`, and `src/lib/utils.js` are
already set up, so `add` should drop files straight into `src/components/ui/`. If the
CLI asks to init, accept defaults (style: new-york, base color: slate, CSS variables:
yes). Do not overwrite `src/index.css` (it carries the Eon palette) — keep the existing
one if prompted.

## Step 2 — create the Supabase project + schema

Create a project at supabase.com (or `supabase projects create`). Then run the schema:

- Supabase dashboard → SQL editor → paste `supabase/schema.sql` → run.
- Later, after the first user has signed up (so a team row exists), optionally run
  `supabase/seed.sql` to load the two starter stories.

The schema creates: `teams`, `profiles` (role admin/member), `projects` (stories),
`assets` (media), RLS policies, a signup trigger (first user becomes admin), and a
public `media` storage bucket. Read it before running.

## Step 3 — env

```bash
cp .env.example .env
```

Fill from Supabase → Settings → API:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the anon PUBLIC key — never the service_role key)
- `VITE_BASE` = `/<your-repo-name>/` (e.g. `/eon-prototype-hub/`). Use `/` only for a
  `username.github.io` user site.

Optional: enable Google as an auth provider in Supabase → Authentication → Providers,
and add your GitHub Pages URL to Authentication → URL Configuration → Redirect URLs
(needed for magic-link and OAuth to return correctly).

## Step 4 — run locally

```bash
npm run dev
```

Sign up with your email (magic link). You become the admin. Verify:
- Sidebar lists prototypes (empty until you add one or run the seed).
- Editing notes / Figma URL / Linear id updates and persists on reload.
- A valid Figma share URL renders a live embedded frame under Links.
- Media tab: replacing a logo URL flows into the prototypes.
- `/admin` (shield icon, bottom-left) lists members and lets you change roles.
- Open a second browser/account: changes appear live (realtime).

## Step 5 — deploy to GitHub Pages

1. Push to a GitHub repo named to match `VITE_BASE`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Repo → Settings → Secrets and variables → Actions:
   - **Variables**: `VITE_BASE` (e.g. `/eon-prototype-hub/`), `VITE_SUPABASE_URL`.
   - **Secrets**: `VITE_SUPABASE_ANON_KEY`.
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and deploys.
5. Add the resulting Pages URL to Supabase Auth Redirect URLs so login returns to it.

The app uses HashRouter, so client routes work on Pages without a 404.html.

## Data model (quick reference)

- `projects`: slug, title, group_name, status, prototype_html, controls (jsonb),
  defaults (jsonb), figma_url, issue_id, issue_url, notes, sort_order.
- A project renders from `prototype_html` if set; otherwise from a built-in builder
  matching its `slug` (`signin`, `dashboard` in `src/features/hub/prototypes.js`);
  otherwise a placeholder. To host new prototypes, save their HTML into `prototype_html`.
- `assets`: key (`eonLogo`, `acmeLogo`), url. Replaces logos everywhere.

## Things to finish / improve (in priority order)

1. **Upload prototypes**: add a form (or drag-drop) that writes HTML to
   `projects.prototype_html`, so non-builtin prototypes render. Optionally store larger
   prototypes as files in a `prototypes` Storage bucket and iframe by URL.
2. **Live Linear/Figma**: the Linear card is a static preview. Wire a Linear API read
   (via an edge function to keep the token server-side) to populate title/status/assignee
   and drive the status badge.
3. **Invites**: admins should invite teammates by email (Supabase `inviteUserByEmail`
   via an edge function) rather than relying on open signup.
4. **Delete + reorder** prototypes (admin), and drag-to-reorder `sort_order`.
5. **Accessibility**: focus rings, aria-labels on icon-only buttons, keyboard nav.

## Changelog

Every push that changes the platform adds an entry to `src/lib/changelog.js`
(newest first, grouped by day — extend today's entry if one exists) in the same
commit. Users see it via "What's new" (sparkles, sidebar footer).

## Guardrails

- Only the anon key goes in the client. Never commit `.env` or the service_role key.
- All access is enforced by RLS; do not disable it. Test policies with a member account,
  not just the admin.
- Keep `src/index.css` Eon palette; keep DM Sans as the app font.
