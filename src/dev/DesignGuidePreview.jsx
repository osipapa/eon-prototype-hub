import { useState } from "react";
import DesignGuide, { DEFAULT_DESIGN_PAGE } from "@/features/design/DesignGuide";
import { KB_SEED } from "@/features/design/kbSeed";

// Signed-out preview: the bundled pages, with edits kept in memory.
export default function DesignGuidePreview() {
  const [activeSlug, setActiveSlug] = useState(() => new URLSearchParams(window.location.search).get("design-preview") || DEFAULT_DESIGN_PAGE);
  const [section, setSection] = useState(() => new URLSearchParams(window.location.search).get("s"));
  const [entries, setEntries] = useState(() => KB_SEED.map((entry) => ({ ...entry, version: 1, updated_at: "2026-10-08T12:00:00Z" })));
  const kb = {
    entries,
    source: "preview",
    save: async (draft, original) => {
      const row = { ...draft, version: (original?.version ?? 0) + 1, updated_at: new Date().toISOString() };
      setEntries((current) => [...current.filter((entry) => entry.slug !== (original?.slug ?? draft.slug)), row]);
      return row;
    },
    remove: async (target) => setEntries((current) => current.filter((entry) => entry.slug !== target.slug)),
  };
  return (
    <DesignGuide
      activeSlug={activeSlug}
      activeSection={section}
      kb={kb}
      userEmail="mate@example.com"
      isAdmin
      onSelectPage={(slug, nextSection) => { setActiveSlug(slug); setSection(nextSection ?? null); }}
      onOpenPrototypes={() => {}}
      onOpenPrompts={() => {}}
      onOpenRoute={() => {}}
      onOpenAdmin={() => {}}
      onSignOut={() => {}}
    />
  );
}
