import FullScreen from "../features/hub/FullScreen";
import { parseMirrorParams } from "../lib/mirror";
import { initialProjects } from "./WorkspacePreview";

// ?full-preview=<slug>: Full view's own tab, with the preview's demo prototypes.
export default function FullPreview() {
  const params = new URLSearchParams(window.location.search);
  const view = { ...parseMirrorParams(window.location.search), slug: params.get("full-preview") };
  return <FullScreen projects={initialProjects} media={{}} view={view} />;
}
