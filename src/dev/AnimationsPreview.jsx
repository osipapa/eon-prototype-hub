import AnimationsView from "../features/hub/AnimationsView";
import { CHECKOUT_DEMO } from "./WorkspacePreview";

// Dev-only: ?animations-preview[=<animation id>] renders the hosted Animations
// page for the mock checkout prototype, without signing in.
export default function AnimationsPreview() {
  const focusId = new URLSearchParams(window.location.search).get("animations-preview") || undefined;
  return (
    <AnimationsView
      project={{ slug: "checkout-concept", title: "Checkout concept", prototype_html: CHECKOUT_DEMO }}
      focusId={focusId}
    />
  );
}
