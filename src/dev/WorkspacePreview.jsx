import { useState } from "react";
import LoadingScreen from "../components/LoadingScreen";
import PrototypeWorkspace from "../features/hub/PrototypeWorkspace";
import FirstRunTutorial from "../features/onboarding/FirstRunTutorial";
import { validTutorialPersona } from "../features/onboarding/tutorial";

const initialProjects = [
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
    figma_url: "",
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
    figma_url: "",
    issue_id: "",
    issue_url: "",
    notes: "",
    sort_order: 1,
  },
  {
    id: "preview-checkout",
    slug: "checkout-exploration",
    title: "Checkout exploration",
    group_name: "Growth experiments",
    status: "Exploration",
    controls: [],
    defaults: {},
    figma_url: "",
    issue_id: "",
    issue_url: "",
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
    body: "Yes — I’ll add the narrow viewport to this review pass.",
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
    body: "Canceled rows read as disabled — can we soften this pill?",
    // Pinned to the Hooli table row in the mobile layout — clicking this
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
    body: "Logo was fuzzy on retina — swapped the asset.",
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
  { id: "act-2", project_id: "preview-dashboard", project_title: "Customer dashboard", actor_id: "teammate-1", actor_name: "Alex Chen", action: "status_changed", detail: { from: "Exploration", to: "In review" }, created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
  { id: "act-3", project_id: "preview-dashboard", project_title: "Customer dashboard", actor_id: "preview-user", actor_name: "Mate", action: "edited_notes", detail: {}, created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString() },
  { id: "act-4", project_id: "preview-dashboard", project_title: "Customer dashboard", actor_id: "teammate-2", actor_name: "Priya Nair", action: "edited_figma", detail: { to: "https://figma.com/x" }, created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
];

export default function WorkspacePreview() {
  const tutorialParams = new URLSearchParams(window.location.search);
  // ?workspace-preview&loading — QA view of the app loading screen.
  if (tutorialParams.has("loading")) return <LoadingScreen>Loading prototypes…</LoadingScreen>;
  const [projects, setProjects] = useState(initialProjects);
  const [comments, setComments] = useState(initialComments);
  const [assets, setAssets] = useState({});
  const [activity] = useState(initialActivity);
  const [toasts, setToasts] = useState([
    { toastId: "t1", actor_name: "Priya Nair", action: "edited_figma", detail: { to: "x" }, project_title: "Customer dashboard" },
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

  return (
    <>
      <PrototypeWorkspace
        projects={projects}
        assets={assets}
        comments={comments}
        activity={activity}
        coViewers={coViewers}
        toasts={toasts}
        onDismissToast={(toastId) => setToasts((items) => items.filter((item) => item.toastId !== toastId))}
        isAdmin
        profile={{ id: "preview-user", full_name: "Mate", role: "admin" }}
        userEmail="mate@example.com"
        activeId={activeId}
        onSelectStory={(project) => setActiveId(project?.id)}
        onPatchProject={patchProject}
        onSetAsset={(key, url) => setAssets((current) => ({ ...current, [key]: url }))}
        onNewProject={async () => {}}
        onDeleteProject={(id) => setProjects((items) => items.filter((item) => item.id !== id))}
        onReorder={() => {}}
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
        onOpenAdmin={() => {}}
        onSignOut={() => {}}
      />
      {tutorialOpen && <FirstRunTutorial firstName="Mate" initialPersona={tutorialPersona} isQa onExit={() => setTutorialOpen(false)} />}
    </>
  );
}
