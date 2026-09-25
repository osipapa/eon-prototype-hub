import { useEffect, useRef, useState } from "react";
import LoadingScreen from "../components/LoadingScreen";
import PrototypeWorkspace from "../features/hub/PrototypeWorkspace";
import FirstRunTutorial from "../features/onboarding/FirstRunTutorial";
import { validTutorialPersona } from "../features/onboarding/tutorial";

// A small clickable flow, so the preview can exercise interaction mirroring.
const CHECKOUT_DEMO = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;font:15px/1.45 system-ui,sans-serif;background:#0b0b0c;color:#fafafa}
.screen{display:none;padding:28px 22px}.screen.on{display:block}
h1{margin:0 0 6px;font-size:24px}p{margin:0 0 18px;color:#a1a1aa}
button{min-height:48px;padding:0 20px;border:0;border-radius:12px;background:#e8e8e8;color:#141414;font:inherit;font-weight:600}
input{box-sizing:border-box;width:100%;min-height:48px;margin:0 0 14px;padding:0 14px;border:1px solid #333;border-radius:12px;background:#161616;color:inherit;font:inherit;font-size:16px}
.list{height:240px;margin:0 0 16px;overflow:auto;border:1px solid #333;border-radius:12px}.list div{padding:14px 16px;border-bottom:1px solid #222}
</style></head><body>
<section class="screen on" id="plan"><h1>Checkout</h1><p>Pick a plan and continue.</p><button onclick="go('details')">Continue</button></section>
<section class="screen" id="details"><h1>Your details</h1><p>Where should the receipt go?</p><input aria-label="Email" placeholder="you@example.com">
<div class="list">${Array.from({ length: 14 }, (_, index) => `<div>Saved card ${index + 1}</div>`).join("")}</div><button onclick="go('paid')">Pay $24.00</button></section>
<section class="screen" id="paid"><h1>Paid</h1><p>Receipt sent.</p><button onclick="go('plan')">Start over</button></section>
<script>function go(id){document.querySelectorAll(".screen").forEach(function(s){s.classList.toggle("on",s.id===id);});}</script>
</body></html>`;

// Stands in for the linear-issue edge function, so status sections render.
const PREVIEW_ISSUES = {
  "DES-706": { title: "Rate your trip", state: { name: "In Review", color: "#4CB782", type: "started" } },
  "DES-712": { title: "Checkout concept", state: { name: "In Progress", color: "#F2C94C", type: "started" } },
};
const loadPreviewIssue = (identifier) => new Promise((resolve) => {
  window.setTimeout(() => {
    const issue = PREVIEW_ISSUES[identifier];
    resolve(issue ? { identifier, updatedAt: new Date().toISOString(), description: "", labels: [], ...issue } : null);
  }, 250);
});

export const initialProjects = [
  {
    id: "preview-dashboard",
    slug: "dashboard",
    title: "Customer dashboard",
    group_name: "Core product",
    status: "In review",
    controls: [
      { key: "plan", label: "Plan", options: ["free", "pro"] },
      { key: "state", label: "State", options: ["default", "empty", "loading"] },
    ],
    defaults: { plan: "pro", state: "default" },
    issue_id: "",
    issue_url: "",
    notes: "Validate the empty and loading states with Product before handoff.",
    sort_order: 0,
  },
  {
    id: "preview-signin",
    slug: "signin",
    title: "Sign in",
    group_name: "Core product",
    status: "Handoff",
    controls: [{ key: "state", label: "State", options: ["default", "error", "loading"] }],
    defaults: { state: "default" },
    issue_id: "",
    issue_url: "https://linear.app/eon/issue/DES-706/rate-your-trip",
    notes: "",
    sort_order: 1,
  },
  {
    id: "preview-checkout",
    slug: "checkout-concept",
    title: "Checkout concept",
    group_name: "Growth experiments",
    status: "In review",
    prototype_html: CHECKOUT_DEMO,
    issue_url: "https://linear.app/eon/issue/DES-712/checkout-concept",
    // Deliberately long, so the preview exercises the collapsed state control.
    controls: [
      { key: "state", label: "State", options: [
        "trip-details", "free-slots", "last-free", "first-paid", "mixed",
        "duplicate", "at-limit", "declined", "sent",
      ] },
    ],
    defaults: { state: "mixed" },
    issue_id: "",
    notes: "",
    sort_order: 2,
  },
];

const initialComments = [
  {
    id: "comment-1",
    project_id: "preview-dashboard",
    author_id: "teammate-1",
    body: "The hierarchy is much clearer. Can we verify the mobile table state before approval?",
    created_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    author: { id: "teammate-1", full_name: "Alex Chen", email: "alex@example.com" },
  },
  {
    id: "comment-2",
    project_id: "preview-dashboard",
    author_id: "preview-user",
    body: "Yes. I'll add the narrow viewport to this review pass.",
    created_at: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
    author: { id: "preview-user", full_name: "Mate", email: "mate@example.com" },
  },
  {
    id: "comment-anchored",
    project_id: "preview-dashboard",
    author_id: "teammate-1",
    body: "This table needs more breathing room above it.",
    // Placed against the preview's default canvas state (laptop / dark / pro).
    anchor: {
      selector: "main", rel_x: 0.5, rel_y: 0.55, x_pct: 60, y_pct: 55,
      viewport: "laptop", args: { plan: "pro", state: "default" }, theme: "dark",
    },
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    author: { id: "teammate-1", full_name: "Alex Chen", email: "alex@example.com" },
    reactions: [
      { emoji: "👍", profile_id: "teammate-2" },
      { emoji: "👍", profile_id: "preview-user" },
      { emoji: "🔥", profile_id: "teammate-2" },
    ],
  },
  {
    id: "comment-anchored-mobile",
    project_id: "preview-dashboard",
    author_id: "teammate-2",
    body: "Canceled rows read as disabled. Can we soften this pill?",
    // Pinned to the Hooli table row in the mobile layout. Clicking this
    // comment exercises the jump's state restore across viewport + theme.
    anchor: {
      selector: "div:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(5)",
      rel_x: 0.5, rel_y: 0.5, x_pct: 50, y_pct: 90,
      viewport: "mobile", args: { plan: "pro", state: "default" }, theme: "dark",
    },
    created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    author: { id: "teammate-2", full_name: "Priya Nair", email: "priya@example.com" },
  },
  {
    id: "comment-resolved",
    project_id: "preview-dashboard",
    author_id: "preview-user",
    body: "The logo was fuzzy on Retina displays. I swapped the asset.",
    resolved_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolved_by: "teammate-1",
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    author: { id: "preview-user", full_name: "Mate", email: "mate@example.com" },
  },
  {
    id: "comment-3",
    project_id: "preview-dashboard",
    author_id: "teammate-2",
    body: "Here's the overflow I hit at 360px:",
    // Inline so the preview renders without network or a seeded storage object.
    image_url: "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#2B2F36"/><rect x="16" y="16" width="180" height="18" rx="4" fill="#5B6472"/><rect x="16" y="48" width="288" height="10" rx="3" fill="#414852"/><rect x="16" y="68" width="240" height="10" rx="3" fill="#414852"/><rect x="16" y="112" width="120" height="34" rx="8" fill="#7C5CFF"/></svg>`),
    created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    author: { id: "teammate-2", full_name: "Priya Nair", email: "priya@example.com" },
  },
];

const initialActivity = [
  { id: "act-1", project_id: "preview-dashboard", project_title: "Customer dashboard", actor_id: "teammate-1", actor_name: "Alex Chen", action: "uploaded_html", detail: {}, created_at: new Date(Date.now() - 52 * 60 * 1000).toISOString() },
  { id: "act-2", project_id: "preview-dashboard", project_title: "Customer dashboard", actor_id: "teammate-1", actor_name: "Alex Chen", action: "status_changed", detail: { from: "Backlog", to: "In review" }, created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
  { id: "act-3", project_id: "preview-dashboard", project_title: "Customer dashboard", actor_id: "preview-user", actor_name: "Mate", action: "edited_notes", detail: {}, created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString() },
  { id: "act-4", project_id: "preview-dashboard", project_title: "Customer dashboard", actor_id: "teammate-2", actor_name: "Priya Nair", action: "updated_html", detail: null, created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
];

export default function WorkspacePreview() {
  const tutorialParams = new URLSearchParams(window.location.search);
  // ?workspace-preview&loading opens the QA view of the app loading screen.
  if (tutorialParams.has("loading")) return <LoadingScreen>Loading prototypes…</LoadingScreen>;
  const [projects, setProjects] = useState(initialProjects);
  const [comments, setComments] = useState(initialComments);
  // The real workspace gets this from the media library; seeding it here lets
  // the preview exercise the mobile mockup.
  const [assets, setAssets] = useState({
    iPhone: "https://cdn.prod.website-files.com/663a718629c975b39d9e15fa/6a90931064d7dc0b26811064_iPhone%2017%20Pro%20-%20Deep%20Blue%20-%20Portrait.png",
    "Model-Y": "https://cdn.prod.website-files.com/663a718629c975b39d9e15fa/6ab2c01dfd68dc2efa29b489_tesla-modelY-2026-grey-dark-front-1280x720.webp",
    "tesla-logo": "https://cdn.prod.website-files.com/663a718629c975b39d9e15fa/68769781d3ab1aefe8ec85f6_tesla-logo-dark.avif",
    "tesla-models": "https://cdn.prod.website-files.com/663a718629c975b39d9e15fa/68d2e3b895888fe9ebd8810a_tesla-model3-2024-grey-light-side-2560x1440.webp",
  });
  const [activity] = useState(initialActivity);
  const [toasts, setToasts] = useState([
    { toastId: "t1", actor_name: "Priya Nair", action: "updated_html", detail: null, project_title: "Customer dashboard" },
  ]);
  const coViewers = [
    { id: "teammate-1", name: "Alex Chen", email: "alex@example.com", project_id: "preview-dashboard" },
    { id: "teammate-2", name: "Priya Nair", email: "priya@example.com", project_id: "preview-dashboard" },
  ];
  const [activeId, setActiveId] = useState(initialProjects[0].id);
  const [tutorialOpen, setTutorialOpen] = useState(() => tutorialParams.get("tutorial") === "1");
  const tutorialPersona = validTutorialPersona(tutorialParams.get("persona"));

  const patchProject = (id, patch) => {
    setProjects((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  // Stand-in for Hub's guarded publish: same compare-and-swap on html_version.
  const publishHtml = async (id, html, baseVersion) => {
    const current = projectsRef.current.find((item) => item.id === id);
    if ((current?.html_version ?? 0) !== baseVersion) return { conflict: true };
    const version = baseVersion + 1;
    setProjects((items) => items.map((item) => (item.id === id ? { ...item, prototype_html: html, html_version: version } : item)));
    return { version };
  };

  // Dev only: simulate a teammate's save, to exercise the linked-file guard.
  useEffect(() => {
    window.__eonPreviewTeammateSave = (slug) => setProjects((items) => items.map((item) => (item.slug === slug
      ? { ...item, prototype_html: `${item.prototype_html || ""}\n<!-- teammate edit -->`, html_version: (item.html_version ?? 0) + 1 }
      : item)));
    return () => { delete window.__eonPreviewTeammateSave; };
  }, []);

  return (
    <>
      <PrototypeWorkspace
        projects={projects}
        assets={assets}
        comments={comments}
        activity={activity}
        mirrorTransport="local"
        loadLinearIssue={loadPreviewIssue}
        coViewers={coViewers}
        toasts={toasts}
        onDismissToast={(toastId) => setToasts((items) => items.filter((item) => item.toastId !== toastId))}
        isAdmin
        profile={{ id: "preview-user", full_name: "Mate", role: "admin" }}
        userEmail="mate@example.com"
        activeId={activeId}
        onSelectStory={(project) => setActiveId(project?.id)}
        onPatchProject={patchProject}
        onPublishHtml={publishHtml}
        onSetAsset={(key, url) => setAssets((current) => ({ ...current, [key]: url }))}
        onDeleteAsset={(key) => setAssets((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        })}
        onNewProject={async () => {}}
        onDeleteProject={(id) => setProjects((items) => items.filter((item) => item.id !== id))}
        initialView={tutorialParams.has("media") ? "media" : "stories"}
        onReorder={(orderedIds, groupById = {}) => setProjects((items) => orderedIds.map((id, index) => {
          const item = items.find((project) => project.id === id);
          return { ...item, sort_order: index, group_name: groupById[id] ?? item.group_name };
        }))}
        onCreateComment={async (projectId, body, imageUrl = null, anchor = null) => {
          setComments((items) => [...items, {
            id: `preview-${Date.now()}`,
            project_id: projectId,
            author_id: "preview-user",
            body,
            image_url: imageUrl,
            anchor,
            created_at: new Date().toISOString(),
            author: { id: "preview-user", full_name: "Mate", email: "mate@example.com" },
          }]);
        }}
        onEditComment={async (commentId, body) => {
          setComments((items) => items.map((item) => item.id === commentId ? { ...item, body } : item));
        }}
        onDeleteComment={async (commentId) => {
          setComments((items) => items.filter((item) => item.id !== commentId));
        }}
        onResolveComment={async (commentId, resolved) => {
          setComments((items) => items.map((item) => item.id === commentId
            ? { ...item, resolved_at: resolved ? new Date().toISOString() : null, resolved_by: resolved ? "preview-user" : null }
            : item));
        }}
        onToggleReaction={async (commentId, emoji) => {
          setComments((items) => items.map((item) => {
            if (item.id !== commentId) return item;
            const mine = (item.reactions || []).some((r) => r.profile_id === "preview-user" && r.emoji === emoji);
            return {
              ...item,
              reactions: mine
                ? (item.reactions || []).filter((r) => !(r.profile_id === "preview-user" && r.emoji === emoji))
                : [...(item.reactions || []), { emoji, profile_id: "preview-user" }],
            };
          }));
        }}
        onOpenDesign={() => {}}
        onOpenPrompts={() => {}}
        onOpenTracking={() => {}}
        onOpenAdmin={() => {}}
        onSignOut={() => {}}
      />
      {tutorialOpen && <FirstRunTutorial firstName="Mate" initialPersona={tutorialPersona} isQa onExit={() => setTutorialOpen(false)} />}
    </>
  );
}
