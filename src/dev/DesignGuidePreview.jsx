import { useState } from "react";
import DesignGuide from "@/features/design/DesignGuide";

export default function DesignGuidePreview() {
  const [activeSlug, setActiveSlug] = useState(() => new URLSearchParams(window.location.search).get("design-preview") || "overview");
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
