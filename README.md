# Eon Prototype Hub

A shared, Storybook-style hub for interactive HTML prototypes. Sign in, browse
prototypes by group, preview them across device sizes with independent hub and
prototype themes, attach Figma frames and Linear issues, keep notes, and manage a
shared media library. Team state lives in Supabase; the site is hosted on GitHub Pages.

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

- **Member**: view and edit prototypes, links, notes, and media.
- **Admin**: everything a member can do, plus manage roles (`/admin`) and delete content.

## Structure

```
src/
  lib/         supabase client, auth context, data access
  routes/      Login, Hub, Admin
  features/hub/ PrototypeHub UI + prototype builders/media
supabase/      schema.sql (tables + RLS), seed.sql
.github/workflows/deploy.yml   GitHub Pages CI
```
