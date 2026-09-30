import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import AnimationsView from "@/features/hub/AnimationsView";
import { fetchProjectBySlug } from "@/lib/data";

// #/animations/<slug>[/<animation id>]: the hosted page Assets links to.
export default function Animations() {
  const { slug, animationId } = useParams();
  const [state, setState] = useState({ phase: "loading" });

  useEffect(() => {
    let live = true;
    setState({ phase: "loading" });
    fetchProjectBySlug(slug)
      .then((project) => { if (live) setState(project ? { phase: "ready", project } : { phase: "missing" }); })
      .catch((error) => { if (live) setState({ phase: "error", message: error.message }); });
    return () => { live = false; };
  }, [slug]);

  if (state.phase === "loading") return <LoadingScreen>Loading animations…</LoadingScreen>;
  if (state.phase !== "ready") {
    return (
      <LoadingScreen>
        {state.phase === "missing" ? "There's no prototype at this link." : `Animations couldn't load. ${state.message || ""}`}
      </LoadingScreen>
    );
  }
  return <AnimationsView project={state.project} focusId={animationId} />;
}
