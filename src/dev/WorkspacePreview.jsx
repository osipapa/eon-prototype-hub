import { useState } from "react";
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
        onCreateComment={async (projectId, body, imageUrl = null) => {
          setComments((items) => [...items, {
            id: `preview-${Date.now()}`,
            project_id: projectId,
            author_id: "preview-user",
            body,
            image_url: imageUrl,
            created_at: new Date().toISOString(),
            author: { id: "preview-user", full_name: "Mate", email: "mate@example.com" },
          }]);
        }}
        onOpenAdmin={() => {}}
        onSignOut={() => {}}
      />
      {tutorialOpen && <FirstRunTutorial firstName="Mate" initialPersona={tutorialPersona} isQa onExit={() => setTutorialOpen(false)} />}
    </>
  );
}
