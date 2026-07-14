import { useState } from "react";
import PrototypeWorkspace from "../features/hub/PrototypeWorkspace";

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
];

export default function WorkspacePreview() {
  const [projects, setProjects] = useState(initialProjects);
  const [comments, setComments] = useState(initialComments);
  const [activeId, setActiveId] = useState(initialProjects[0].id);

  const patchProject = (id, patch) => {
    setProjects((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  return (
    <PrototypeWorkspace
      projects={projects}
      assets={{}}
      comments={comments}
      isAdmin
      profile={{ id: "preview-user", full_name: "Mate", role: "admin" }}
      userEmail="mate@example.com"
      activeId={activeId}
      onSelectStory={(project) => setActiveId(project?.id)}
      onPatchProject={patchProject}
      onSetAsset={() => {}}
      onNewProject={async () => {}}
      onDeleteProject={(id) => setProjects((items) => items.filter((item) => item.id !== id))}
      onReorder={() => {}}
      onCreateComment={async (projectId, body) => {
        setComments((items) => [...items, {
          id: `preview-${Date.now()}`,
          project_id: projectId,
          author_id: "preview-user",
          body,
          created_at: new Date().toISOString(),
          author: { id: "preview-user", full_name: "Mate", email: "mate@example.com" },
        }]);
      }}
      onOpenAdmin={() => {}}
      onSignOut={() => {}}
    />
  );
}
