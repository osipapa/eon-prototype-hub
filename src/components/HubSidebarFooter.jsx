import { Check, Copy, LogOut, Shield } from "lucide-react";
import { HubChangelogButton } from "@/components/HubChangelog";

export default function HubSidebarFooter({
  c,
  copiedPrompt,
  onCopySetupPrompt,
  userEmail,
  isAdmin,
  onOpenAdmin,
  onSignOut,
  changelog,
}) {
  return (
    <div className="eon-sidebar-foot" style={{ borderColor: c.border }}>
      <span title={userEmail || ""} style={{ color: c.muted }}>{userEmail || "Team member"}</span>
      <HubChangelogButton c={c} hasNew={changelog.hasNew} onOpen={changelog.open} />
      {onCopySetupPrompt && (
        <button
          data-tutorial="setup-prompt"
          className="eon-buttonish eon-icon-button"
          type="button"
          onClick={onCopySetupPrompt}
          aria-label={copiedPrompt ? "Setup prompt copied" : "Copy setup prompt"}
          title={copiedPrompt ? "Copied" : "Copy setup prompt"}
          style={{ color: copiedPrompt ? c.brand : c.muted, boxShadow: "var(--shadow-surface)" }}
        >
          {copiedPrompt ? <Check size={15} /> : <Copy size={15} />}
        </button>
      )}
      {isAdmin && (
        <button
          className="eon-buttonish eon-icon-button"
          type="button"
          onClick={onOpenAdmin}
          aria-label="Admin dashboard"
          title="Admin dashboard"
          style={{ color: c.muted, boxShadow: "var(--shadow-surface)" }}
        >
          <Shield size={15} />
        </button>
      )}
      <button
        className="eon-buttonish eon-icon-button"
        type="button"
        onClick={onSignOut}
        aria-label="Sign out"
        title="Sign out"
        style={{ color: c.muted, boxShadow: "var(--shadow-surface)" }}
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
