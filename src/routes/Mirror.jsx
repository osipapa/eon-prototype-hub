import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import MirrorScreen from "../features/hub/MirrorScreen";
import { parseMirrorParams } from "../lib/mirror";
import useLiveWorkspace from "./useLiveWorkspace";

/* #/mirror/<session>: the phone end of "Open on your phone". Loads the team's
   prototypes and media through the signed-in session and keeps them live. */
export default function Mirror() {
  const { session } = useParams();
  const location = useLocation();
  const [initialView] = useState(() => parseMirrorParams(location.search));
  const { projects, assets, error } = useLiveWorkspace();

  if (error) {
    return (
      <div className="eon-mirror">
        <p className="eon-mirror-message">
          {error}
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </p>
      </div>
    );
  }
  if (!projects) return <LoadingScreen>Loading prototype…</LoadingScreen>;
  return <MirrorScreen projects={projects} media={assets} sessionId={session} initialView={initialView} />;
}
