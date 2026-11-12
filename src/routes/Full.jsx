import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import FullScreen from "../features/hub/FullScreen";
import { parseMirrorParams } from "../lib/mirror";
import useLiveWorkspace from "./useLiveWorkspace";

/* #/full/<slug>: where Full view sends a desktop prototype. The prototype
   fills the browser window, so it lays out at the real screen size. */
export default function Full() {
  const { slug } = useParams();
  const location = useLocation();
  const view = useMemo(() => ({ ...parseMirrorParams(location.search), slug }), [location.search, slug]);
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
  return <FullScreen projects={projects} media={assets} view={view} />;
}
