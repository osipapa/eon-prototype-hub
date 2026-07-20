# Anchored comments — design

2026-07-20 · Eon Prototype Hub

Comments can pin to a specific element of the rendered prototype, with a
visible leader line from the comment card to the pin, and any team member can
resolve/unresolve a comment.

## Decisions

- **Element-tracked anchors.** Pins attach to the clicked DOM element inside
  the prototype (not fixed canvas coordinates), so they survive internal
  scrolling and small layout shifts. Fallback to stored `%` coordinates when
  the selector no longer resolves.
- **Anyone on the team can resolve.** Done via an RPC, since comment-row RLS
  updates are author-only.
- **State-aware pins.** An anchor remembers viewport + control args + theme.
  Only pins matching the current canvas state render; other comments show a
  state chip that restores their exact state when clicked.

## Data model

Migration (applied to live DB and mirrored in `supabase/schema.sql`):

```sql
alter table public.comments add column if not exists anchor jsonb;
alter table public.comments add column if not exists resolved_at timestamptz;
alter table public.comments add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

create or replace function public.set_comment_resolved(comment_id uuid, resolved boolean)
returns setof public.comments  -- returns the updated row for optimistic UI
language sql security definer set search_path = public as $$
  update public.comments
     set resolved_at = case when resolved then now() else null end,
         resolved_by = case when resolved then auth.uid() else null end
   where id = comment_id and team_id = public.current_team_id()
  returning *;
$$;
```

`anchor` shape:

```json
{
  "selector": "main > section:nth-of-type(2) > table",  // DOM path in prototype
  "x_pct": 42.1, "y_pct": 63.8,   // click point, % of prototype viewport (fallback)
  "viewport": "laptop",            // VIEWPORTS key at placement time
  "args": { "plan": "pro", "state": "default" },
  "theme": "dark"
}
```

Null `anchor` = a plain thread comment (all existing comments).

## Iframe bridge

The prototype iframe is sandboxed **without** `allow-same-origin`, so the hub
cannot touch its DOM. But the hub composes the `srcDoc`, so it appends a small
anchor-bridge `<script>` to every prototype (both built-in `renderStory`
output and uploaded `prototype_html`) that speaks `postMessage`:

Hub → prototype:
- `{type:"eon-anchor-mode", on:boolean}` — toggle crosshair + click capture.
- `{type:"eon-anchor-query", selectors:[...]}` — resolve selectors to rects.

Prototype → hub:
- `{type:"eon-anchor-click", selector, rect, x_pct, y_pct}` — user picked a spot.
- `{type:"eon-anchor-rects", rects:{selector→rect|null}}` — sent in reply to a
  query and re-sent on scroll/resize (throttled via rAF) so pins track.

The bridge builds selectors as structural paths (`nth-of-type` chain, no ids
required), captures clicks in anchor mode only (preventing the prototype's own
handlers), and is inert otherwise. Messages are validated by `type` prefix on
both sides; the iframe has no origin, so the hub matches on the iframe's
`contentWindow` source.

## UI

**Placing.** A pin button in the comment composer toggles anchor mode; the
canvas shows a crosshair. Clicking the prototype drops a numbered pin,
focuses the composer, and shows the pending anchor as a chip (with ×) next to
the attachment preview. Esc or × cancels. Sending stores the anchor on the
comment. Anchor mode is only available in single view (not All-states grid,
compare split, or full view).

**Pins.** An absolutely-positioned overlay above the iframe renders a dot per
open, state-matching, anchored comment (numbered by position in the thread).
Rects come from the bridge and update live. If a selector stops resolving
(prototype HTML changed), fall back to `x_pct/y_pct`.

**Leader line.** Hovering/selecting an anchored comment card highlights its
pin and draws an SVG line from the card's edge to the pin (single overlay
`<svg>` at the workspace root; both endpoints measured with
`getBoundingClientRect`). Hovering a pin highlights + scrolls to its card.

**State chip + jump.** Comment cards whose anchor state ≠ current canvas
state show a chip like `Mobile · Empty`. Clicking it sets viewport/args/theme
to the anchor's values, then flashes the pin.

**Resolve.** Each comment gets a resolve check button (any team member).
Panel header gets an Open/Resolved filter (default Open, with counts).
Resolved pins leave the canvas; unresolve restores. Updates flow through the
existing realtime comments subscription; optimistic toggle with rollback.

## Touchpoints

- `supabase/migrations/…_comment_anchors.sql`, `supabase/schema.sql`
- `src/lib/data.js` — `setCommentResolved()`
- `src/features/hub/prototypes.js` or workspace — inject bridge into srcDoc
- `src/features/hub/PrototypeWorkspace.jsx` — anchor mode, pin overlay,
  leader line, composer chip, resolve UI, filter
- `src/routes/Hub.jsx` — pass anchor through `onCreateComment`, resolve handler
- `src/dev/WorkspacePreview.jsx` — seeded anchored + resolved comments,
  local resolve handler

## Edge cases

- Comments with anchors but deleted/changed elements → coordinate fallback.
- Iframe remounts on args/theme change (keyed) → overlay re-queries rects
  after each mount handshake (`{type:"eon-anchor-ready"}` from bridge).
- Uploaded prototypes with strict inline HTML (no `</body>`) → append script
  at end of document; script tolerates any DOM shape.
- Pins and image attachments coexist on one comment.
- Old clients (deployed before migration): extra columns are ignored; RPC
  unused. Safe to migrate first.

## Testing

- Dev harness (`?workspace-preview=1`): seeded anchored comment renders a pin;
  placing, sending, resolving, filtering, and jump-to-context all exercised
  browser-side without auth.
- RPC exercised against live DB with SQL (team check, resolve/unresolve).
- Regression: plain comments, image attachments, realtime updates unchanged.
