import { useState } from "react";
import PromptLibrary from "@/features/prompts/PromptLibrary";
import { STARTER_PROMPTS } from "@/features/prompts/starterPrompts";

export default function PromptLibraryPreview() {
  const [prompts, setPrompts] = useState(STARTER_PROMPTS);
  const [activeSlug, setActiveSlug] = useState(STARTER_PROMPTS[0].slug);

  return (
    <PromptLibrary
      prompts={prompts}
      source="shared"
      userEmail="mate@example.com"
      isAdmin
      currentUserId="preview-user"
      activeSlug={activeSlug}
      onSelectPrompt={(prompt) => setActiveSlug(prompt.slug)}
      onOpenDesign={() => {}}
      onOpenPrototypes={() => {}}
      onOpenTracking={() => {}}
      onOpenAdmin={() => {}}
      onSignOut={() => {}}
      onCreatePrompt={async (patch) => {
        const created = {
          ...patch,
          id: `preview-${Date.now()}`,
          slug: `preview-${Date.now()}`,
          version: 1,
          created_by: "preview-user",
          updated_at: new Date().toISOString(),
        };
        setPrompts((current) => [...current, created]);
        setActiveSlug(created.slug);
        return created;
      }}
      onUpdatePrompt={async (prompt, patch) => {
        const updated = {
          ...prompt,
          ...patch,
          version: (prompt.version || 1) + 1,
          updated_at: new Date().toISOString(),
        };
        setPrompts((current) => current.map((item) => item.id === prompt.id ? updated : item));
        return updated;
      }}
      onDeletePrompt={async (prompt) => {
        setPrompts((current) => {
          const remaining = current.filter((item) => item.id !== prompt.id);
          setActiveSlug(remaining[0]?.slug || "");
          return remaining;
        });
      }}
    />
  );
}
