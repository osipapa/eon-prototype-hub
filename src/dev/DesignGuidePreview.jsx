import { useState } from "react";
import DesignGuide from "@/features/design/DesignGuide";

export default function DesignGuidePreview() {
  const [activeSlug, setActiveSlug] = useState("overview");
  return (
    <DesignGuide
      activeSlug={activeSlug}
      userEmail="mate@example.com"
      isAdmin
      onSelectPage={(page) => setActiveSlug(page.slug)}
      onOpenPrototypes={() => {}}
      onOpenPrompts={() => {}}
      onOpenTracking={() => {}}
      onOpenAdmin={() => {}}
      onSignOut={() => {}}
    />
  );
}
