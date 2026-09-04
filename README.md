# Eon Design Hub

A shared design hub for interactive HTML prototypes, reusable prompts, and implementation-ready tracking references.
Sign in, browse prototypes by group, preview them across device sizes, copy
team-approved prompts, copy a Mixpanel tracking setup grounded in Linear issues, attach Figma frames and Linear issues, discuss work in
shared comments, and manage a shared media library. Team state lives in Supabase;
the site is hosted on GitHub Pages.

## Quick start

```bash
npm install
npx shadcn@latest add button badge input textarea tabs
cp .env.example .env    # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_BASE
npm run dev
```

Set up the database by running `supabase/schema.sql` in the Supabase SQL editor. The
first person to sign up becomes admin.

Full build + deploy instructions are in `CLAUDE.md`.

## Stack

Vite · React · React Router · Tailwind · shadcn/ui · Supabase (Auth + Postgres +
Storage + Realtime) · GitHub Pages.

## Roles

- **Member**: view and edit prototypes, prompts, links, comments, and media; copy tracking references.
- **Admin**: everything a member can do, plus manage roles (`/admin`) and delete content.

## Structure

```
src/
  lib/         supabase client, auth context, data access
  routes/      Login, Hub, Prompts, Admin
  features/hub/ PrototypeHub UI + prototype builders/media
  features/prompts/ Prompt Library UI + starter references
  features/tracking/ Tracking references rendered inside Eon Design (Mixpanel, website attribution)
supabase/      schema.sql (tables + RLS), seed.sql
.github/workflows/deploy.yml   GitHub Pages CI
```
