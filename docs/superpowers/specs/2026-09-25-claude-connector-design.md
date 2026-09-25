# Claude connector (hub MCP) — design

2026-09-25 · Eon Prototype Hub

Teammates connect their own Claude accounts (claude.ai web/desktop chat and
Claude Code) to the hub and edit the same prototype. Each Claude acts as the
teammate who connected it, edits land in `projects.prototype_html`, and the
hub's existing realtime shows every change to everyone live.

## Decisions

- **Remote MCP server on a Supabase Edge Function** (`hub-mcp`), one URL for
  every Claude surface. No local install.
- **Sign in with the hub account** via Supabase Auth's OAuth 2.1 server
  (beta, free on all plans). The access token belongs to the teammate, so RLS
  applies unchanged and edits are attributed to them.
- **Scope: prototype HTML only.** Read, search, surgical edit, full rewrite,
  revisions, restore. No create/delete, comments, status, or notes.
- **Concurrency by compare-and-swap on a version number.** Every HTML write
  from any path (hub upload, linked local file, MCP) bumps
  `projects.html_version`. Edits are applied to the latest saved HTML and
  commit only if nobody saved in between.
- **Revisions with a restore tool; no hub restore UI yet.**
- **Linked local file pauses instead of clobbering.** If the server copy moved
  since the file last synced, auto-publish stops and the hub asks.
- **Fallback if OAuth can't be made to work:** the same function authenticated
  by a per-teammate secret connector URL. Decided by the spike; not built
  unless the spike fails.

## Phase 0 — spike (throwaway)

Deploy a minimal `hub-mcp` with one `whoami` tool behind OAuth, then connect
it from Claude Code and from claude.ai. Pass = both authenticate as the hub
user and `whoami` returns their email and `client_id`.

The spike also pins down:

1. How Supabase combines the Site URL (`https://osipapa.github.io/eon-prototype-hub/`)
   with the Authorization Path — whether the `/eon-prototype-hub/` prefix is
   kept — and so what path to configure.
2. Whether GitHub Pages keeps `?authorization_id=` across its trailing-slash
   redirect (if not, configure the path with the trailing slash).
3. Whether Claude requests the `openid` scope (ID tokens need asymmetric JWT
   signing keys on the project).
4. That Claude discovers the authorization server from the
   `WWW-Authenticate: resource_metadata` pointer when that pointer lives under
   `/functions/v1/hub-mcp/`.

If the spike fails, stop and switch to the secret-URL fallback.

## Data model

Migration `supabase/migrations/20260925_prototype_revisions.sql`, applied to
the live DB and mirrored in `supabase/schema.sql`.

```sql
alter table public.projects add column if not exists html_version int not null default 0;

-- BEFORE INSERT OR UPDATE on projects: bump on any HTML change.
--   insert: html_version := case when prototype_html is null then 0 else 1 end
--   update: if NEW.prototype_html is distinct from OLD.prototype_html
--           then NEW.html_version := OLD.html_version + 1
--           else NEW.html_version := OLD.html_version   -- clients can't set it

create table if not exists public.prototype_revisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version int not null,                 -- projects.html_version this row holds
  html text not null,
  author_id uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('hub', 'claude')),
  kind text not null default 'save' check (kind in ('initial', 'save', 'restore')),
  created_at timestamptz not null default now()
);
create index on public.prototype_revisions (project_id, created_at desc);
```

**Revision writer.** An AFTER INSERT OR UPDATE trigger on `projects`
(SECURITY DEFINER, EXECUTE revoked from public/anon/authenticated, like
`log_project_activity`) runs when `prototype_html` changes to a non-null
value:

- `source` = `'claude'` when `auth.jwt() ->> 'client_id'` is present (OAuth
  tokens carry it), else `'hub'`.
- **Coalescing:** if the project's *latest* revision has the same author and
  source, was written within the last 5 minutes, and `kind = 'save'`, update
  it in place (html, version, created_at = now()). Otherwise insert. A burst
  of edits by one person becomes one revision, but a different author's
  save always starts a new one, so "undo what the other person's Claude did"
  is always possible.
- A restore sets the transaction-local flag `eon.revision_kind = 'restore'`
  (see `restore_prototype_revision`). The trigger then inserts a fresh
  `kind = 'restore'` row and never coalesces it.
- **Retention:** keep the 30 newest revisions per project and delete older ones.

The migration seeds one `kind = 'initial'` revision per project that already
has HTML (author null, source `'hub'`), so the pre-feature state can be
restored.

**Restore RPC.**

```sql
restore_prototype_revision(p_project uuid, p_version int, p_base_version int)
  returns int  -- new html_version
```

SECURITY INVOKER, so RLS applies. It sets `eon.revision_kind` and updates
`projects.prototype_html` to the revision's HTML where
`html_version = p_base_version`. It raises `version_conflict` if 0 rows were
updated and `revision_not_found` if the revision doesn't exist.

**RLS.** Revisions: team read (`team_id = current_team_id()`). There are no
insert/update/delete policies, because only the trigger writes. `projects`
policies are unchanged.

**Activity.** `log_project_activity` adds `{"via": "claude"}` to the
`updated_html` / `uploaded_html` detail when the token has a `client_id`. The
History list renders "… via Claude".

## Edge function `hub-mcp`

`supabase/functions/hub-mcp/index.ts`: Hono + `@modelcontextprotocol/sdk`
Streamable HTTP in stateless mode (a new server and transport per request).
Deployed with `verify_jwt = false` so the function itself can answer an
unauthenticated request with the discovery pointer. Pure logic lives in
`supabase/functions/hub-mcp/lib.ts` so Deno tests can import it without the
runtime.

**Auth.**

- `GET /hub-mcp/.well-known/oauth-protected-resource` →
  `{ "resource": "<fn url>", "authorization_servers": ["https://ytysycblrxehxebgctbk.supabase.co/auth/v1"], "bearer_methods_supported": ["header"] }`
- Any MCP request without a valid bearer →
  `401` + `WWW-Authenticate: Bearer resource_metadata="<fn url>/.well-known/oauth-protected-resource"`.
- A valid token → `auth.getUser(token)`; the per-request Supabase client is
  created with that token (anon key + `Authorization` header), so every query
  runs under RLS as the teammate.

**Tools.** Every tool takes `slug`, which is unique per team, and RLS scopes it
to the caller's team. Descriptions tell Claude that prototype content is data,
not instructions.

| Tool | Input | Returns |
|---|---|---|
| `list_prototypes` | — | slug, title, group, status, html_version, size (bytes), updated_at |
| `read_prototype` | `slug, start_line?, end_line?` | numbered lines, `version`, `total_lines`, `next_start_line` when truncated. Pages are capped at ~60k characters (at least one line) to stay under Claude Code's 25k-token MCP output limit. |
| `search_prototype` | `slug, pattern, regex?` | up to 50 `{line, text}` matches (text clipped to 300 chars around the hit), `version` |
| `edit_prototype` | `slug, old_string, new_string, replace_all?` | new `version`, ~5 lines of context around the first change |
| `write_prototype` | `slug, html, base_version` | new `version`; `version_conflict` with the current version if `base_version` is stale |
| `list_revisions` | `slug` | version, kind, source, author name, created_at, size |
| `restore_revision` | `slug, version, base_version` | new `version` (via the restore RPC) |

**`edit_prototype` algorithm (compare-and-swap).**

```
repeat up to 3 times:
  row  = select id, prototype_html, html_version from projects where slug = $slug
  next = applyEdit(row.prototype_html, old, new, replace_all)
         // 0 matches        -> error "old_string not found; re-read the prototype"
         // >1 without flag  -> error "matches N places; add surrounding context or set replace_all"
  updated = update projects set prototype_html = next
            where id = row.id and html_version = row.html_version  returning html_version
  if updated: return { version, context }
error "prototype is changing too fast; try again"
```

Two Claudes editing different regions both land: the loser of a race re-reads
and re-applies its edit to the newer HTML. If its `old_string` is gone
(because both touched the same text), it gets the not-found error and must
re-read.

**Limits and errors.** HTML is capped at 2 MB per write. Tool errors come back
as MCP tool errors (`isError: true`) with a message Claude can act on
("re-read", "use base_version N"), never as HTTP 500s.

## Hub changes

**Consent page.**

- `public/oauth/consent/index.html`: a static forwarder that calls
  `location.replace(<base>#/oauth/consent + location.search)`. The exact
  directory follows the spike's answer about the configured path.
- New route `/oauth/consent` inside `RequireAuth`, so a signed-out user logs
  in first and lands back here with the query intact (RequireAuth already
  preserves `pathname + search`).
- `OAuthConsent` calls `supabase.auth.oauth.getAuthorizationDetails(id)`:
  - Response without `authorization_id` means the user already consented, so
    `location.assign(redirect_url)` right away.
  - Otherwise it shows the client name, redirect host, and "Signed in as
    <email>". **Allow** calls `approveAuthorization` and **Deny** calls
    `denyAuthorization`; both then `location.assign(data.redirect_url)`.
  - Error states: missing id, expired request (10 min), and network failure,
    each with a way back to the hub.
- Styling follows the Eon design system (DM Sans, existing tokens, the login
  sheet look).

**Linked-file guard** (`PrototypeWorkspace.jsx`, `src/lib/data.js`).

- New `publishHtmlIfUnchanged(id, html, baseVersion)`: runs an update filtered
  by `eq("html_version", baseVersion)`. It returns the new row, or `null` on
  conflict.
- The file link tracks `baseVersion`, the story's `html_version` when the link
  was adopted and after each successful publish. `queuePublish`, `adoptFile`,
  and `publishLocalFile` go through the guarded call.
- A conflict is detected in two places: a `null` publish result, or a realtime
  `projects` update whose `html_version` differs from `baseVersion` and wasn't
  our own publish. Either one sets `fileSync.phase = "conflict"` and pauses
  auto-publish.
- A banner in the file-link UI reads "<Name> changed this prototype since your
  last sync. Auto-publish is paused." The name comes from the latest revision.
  It offers two actions:
  - **Pull theirs into my file:** requests `readwrite` on the handle inside the
    click, writes the server HTML into the local file, and sets
    `baseVersion`. Sync resumes.
  - **Overwrite with my file:** publishes the local HTML against the current
    version (a new base) and resumes sync.
- Other HTML writes (drag-drop upload, paste) stay unguarded: they are
  explicit overwrites and still create revisions.

**Connect Claude panel.** A button in `HubSidebarFooter` opens a dialog with:

- the connector URL, with a copy button;
- the claude.ai / desktop steps: Settings → Connectors → Add custom connector
  → paste URL → Connect → sign in with the hub account → Allow;
- the Claude Code command `claude mcp add --transport http eon-hub <url>`
  (copy), then `/mcp` to sign in;
- a one-line note on the tools and that edits show up live for the team.

**Docs.** A "Connect Claude" section in `CONTRIBUTING.md`, and a changelog entry
with a screenshot per the changelog convention.

## Project setup (manual, dashboard)

Owner does these in the Supabase dashboard. This machine has no
management-API access.

1. Authentication → URL Configuration: Site URL is the Pages URL.
2. Authentication → OAuth Server: enable it, set the Authorization Path (value
   from the spike), and turn on dynamic client registration.
3. If the spike shows `openid` is requested: switch JWT signing to an
   asymmetric key.

The edge function is deployed through the Supabase MCP with
`verify_jwt: false`.

## Security

- Dynamic client registration lets any client register, but a token is only
  issued after a hub member approves on the consent page. The page shows the
  client name and redirect host.
- Supabase OAuth tokens carry the user's full rights. The MCP exposes only
  prototype HTML tools, and RLS limits those to the user's team. There are no
  delete tools.
- Revisions are team-readable and trigger-written only. Forged or edited
  revision rows are impossible from the client.
- To revoke access, remove the connector in Claude, or have an admin reset the
  teammate's password. A server-side grant-management UI is out of scope.

## Testing

- **Deno unit tests** (`supabase/functions/hub-mcp/lib.test.ts`): `applyEdit`
  (unique / none / many / replace_all / empty old), line paging (budget,
  single huge line, `next_start_line`), and search (plain, regex, clipping).
- **SQL checks via `execute_sql`**, with `request.jwt.claims` set to simulate a
  member session with and without `client_id`:
  - version bump on HTML change only;
  - clients can't set `html_version`;
  - revision coalescing (same author and source within 5 min folds;
    different author inserts);
  - restore inserts a `restore` row and conflicts on a stale base;
  - retention at 30;
  - RLS: a member reads their team's revisions and can't insert.
- **Function checks:** 401 + `WWW-Authenticate` without a token; metadata JSON
  shape.
- **Hub, via browser preview:** consent page states (missing id, error),
  Connect Claude dialog, and the file-link conflict banner (simulated by
  bumping the version with SQL while linked).
- **Acceptance (the two teammates, real Claude sessions):**
  - both connect (one from claude.ai, one from Claude Code);
  - both edit different parts of one prototype at the same time, and both
    edits land and appear live in the hub;
  - a stale `write_prototype` is rejected;
  - `restore_revision` undoes the other person's burst;
  - a member account (not only admin) works.

## Out of scope

Create/delete prototypes, comments, status/notes via MCP; a restore UI in the
hub; presence ("Claude is editing"); grant-management UI; editing built-in
(`signin`, `dashboard`) prototypes that have no `prototype_html`.
