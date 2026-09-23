import MirrorScreen from "../features/hub/MirrorScreen";
import { parseMirrorParams } from "../lib/mirror";
import { initialProjects } from "./WorkspacePreview";

// ?mirror-preview=<session>: the phone end of the mirror with the preview's
// demo prototypes, following a ?workspace-preview tab over a BroadcastChannel.
export default function MirrorPreview() {
  const params = new URLSearchParams(window.location.search);
  return (
    <MirrorScreen
      projects={initialProjects}
      media={{}}
      sessionId={params.get("mirror-preview")}
      initialView={parseMirrorParams(window.location.search)}
      transport="local"
    />
  );
}
