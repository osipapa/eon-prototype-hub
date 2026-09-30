import { LogOut, Shield } from "lucide-react";
import { HubChangelogButton } from "@/components/HubChangelog";
import { ConnectClaudeButton } from "@/components/ConnectClaude";
import ProfileIcon from "@/components/ProfileIcon";
import { useAuth } from "@/lib/auth";

export default function HubSidebarFooter({
  c,
  userEmail,
  isAdmin,
  onOpenAdmin,
  onSignOut,
  changelog,
}) {
  // Previews render without an auth provider, so the profile may be missing.
  const profile = useAuth()?.profile;
  return (
    <div className="eon-sidebar-foot" style={{ borderColor: c.border }}>
      <div className="eon-sidebar-profile" title={userEmail || ""}>
        <ProfileIcon email={userEmail} name={profile?.full_name} src={profile?.avatar_url} size={28} />
        <span style={{ color: c.secondary }}>{userEmail || "Team member"}</span>
      </div>
      <div className="eon-sidebar-foot-actions">
        <HubChangelogButton c={c} hasNew={changelog.hasNew} onOpen={changelog.open} />
        <ConnectClaudeButton c={c} isAdmin={isAdmin} />
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
    </div>
  );
}
