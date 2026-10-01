import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, X } from "lucide-react";
import {
  CHANGELOG, CHANGELOG_SEEN_KEY, changelogGroups,
  latestChangelogDate, markChangelogSeen, readSeenChangelogDate,
} from "@/lib/changelog";

export function useHubChangelog() {
  const [isOpen, setIsOpen] = useState(false);
  const [seenDate, setSeenDate] = useState(() => readSeenChangelogDate());
  // What had been seen before this opening, so the dialog can mark what's new.
  const [newSince, setNewSince] = useState("");
  const hasNew = seenDate < latestChangelogDate();

  useEffect(() => {
    const syncSeenDate = (event) => {
      if (!event?.key || event.key === CHANGELOG_SEEN_KEY) {
        setSeenDate(readSeenChangelogDate());
      }
    };
    window.addEventListener("storage", syncSeenDate);
    window.addEventListener("eon-changelog-seen", syncSeenDate);
    return () => {
      window.removeEventListener("storage", syncSeenDate);
      window.removeEventListener("eon-changelog-seen", syncSeenDate);
    };
  }, []);

  const open = useCallback(() => {
    setNewSince(readSeenChangelogDate());
    setIsOpen(true);
    markChangelogSeen();
    setSeenDate(latestChangelogDate());
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, hasNew, newSince, open, close };
}

export function HubChangelogButton({ c, hasNew, onOpen }) {
  return (
    <button
      className="eon-buttonish eon-icon-button eon-changelog-button"
      type="button"
      onClick={onOpen}
      aria-label={hasNew ? "What's new. Unread updates" : "What's new"}
      title="What's new"
      style={{ color: hasNew ? c.brand : c.muted, boxShadow: "var(--shadow-surface)" }}
    >
      <Megaphone className="eon-accent-icon" size={15} />
      {hasNew && <span className="eon-changelog-dot" style={{ background: c.brand }} aria-hidden="true" />}
    </button>
  );
}

// Releases shown before "Show earlier updates".
const FIRST_RELEASES = 4;

const formatDate = (value) => new Date(`${value}T00:00:00`)
  .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function HubChangelogDialog({ c, open, onClose, newSince = "" }) {
  const dialogRef = useRef(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setShowAll(false);
    const returnFocusTo = document.activeElement;
    // Focus the dialog itself, not its close button, so no ring shows on open.
    dialogRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      returnFocusTo?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const releases = showAll ? CHANGELOG : CHANGELOG.slice(0, FIRST_RELEASES);
  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eon-changelog-title"
        className="eon-modal eon-changelog-dialog"
        style={{ background: c.nav, borderColor: c.border }}
      >
        <div className="eon-modal-head" style={{ borderColor: c.border }}>
          <strong id="eon-changelog-title" style={{ color: c.text }}>What's new</strong>
          <button className="eon-buttonish eon-icon-button" type="button" onClick={onClose} aria-label="Close" style={{ color: c.muted }}>
            <X size={17} />
          </button>
        </div>
        <div className="eon-modal-body eon-changelog-body">
          {releases.map((entry) => {
            const isNew = Boolean(newSince) && entry.date > newSince;
            return (
              <article key={entry.date} className="eon-changelog-entry" style={{ borderColor: c.border }}>
                <p className="eon-changelog-meta" style={{ color: c.muted }}>
                  <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                  {isNew && <span style={{ color: c.brand }}>New</span>}
                </p>
                <h2 style={{ color: c.text }}>{entry.title}</h2>
                {entry.image && (
                  <figure className="eon-changelog-shot">
                    <img src={`${import.meta.env.BASE_URL}${entry.image}`} alt={entry.imageAlt || ""} decoding="async" loading="lazy"
                      style={{ borderColor: c.border }} />
                    {entry.imageAlt && <figcaption style={{ color: c.muted }}>{entry.imageAlt}</figcaption>}
                  </figure>
                )}
                {changelogGroups(entry).map((group) => (
                  <section key={group.label || "all"} className="eon-changelog-group">
                    {group.label && <h3 style={{ color: c.text }}>{group.label}</h3>}
                    <ul style={{ color: c.secondary }}>
                      {group.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </section>
                ))}
              </article>
            );
          })}
          {!showAll && CHANGELOG.length > FIRST_RELEASES && (
            <button className="eon-buttonish eon-context-action eon-changelog-more" type="button" onClick={() => setShowAll(true)}
              style={{ borderColor: c.border, color: c.secondary }}>
              Show earlier updates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
