import { useState } from "react";
import DesignGuide, { DEFAULT_DESIGN_PAGE } from "@/features/design/DesignGuide";

export default function DesignGuidePreview() {
  const [activeSlug, setActiveSlug] = useState(() => new URLSearchParams(window.location.search).get("design-preview") || DEFAULT_DESIGN_PAGE);
  return (
    <DesignGuide
      activeSlug={activeSlug}
      userEmail="mate@example.com"
      isAdmin
      onSelectPage={(page) => setActiveSlug(page.slug)}
      onOpenPrototypes={() => {}}
      onOpenPrompts={() => {}}
      onOpenAdmin={() => {}}
      onSignOut={() => {}}
    />
  );
}
