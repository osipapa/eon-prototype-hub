import { ConsentCard } from "../routes/OAuthConsent";

// Dev-only: ?consent-preview=ready|loading|error renders the OAuth consent card
// without signing in or a real authorization request.
export default function ConsentPreview() {
  const phase = new URLSearchParams(window.location.search).get("consent-preview") || "ready";
  return (
    <ConsentCard
      phase={phase}
      message="This request expired or was already used. Start connecting again from Claude."
      clientName="Claude"
      email="mate@example.com"
      redirectHost="claude.ai"
      onDecide={() => {}}
    />
  );
}
