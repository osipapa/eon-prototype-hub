import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  CHANGELOG, CHANGELOG_SEEN_KEY, latestChangelogDate, markChangelogSeen, readSeenChangelogDate,
} from "@/lib/changelog";

export function useHubChangelog() {
  const [isOpen, setIsOpen] = useState(false);
  const [seenDate, setSeenDate] = useState(() => readSeenChangelogDate());
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
    setIsOpen(true);
    markChangelogSeen();
    setSeenDate(latestChangelogDate());
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, hasNew, open, close };
}

export function HubChangelogButton({ c, hasNew, onOpen }) {
  return (
    <button
      className="eon-buttonish eon-icon-button eon-changelog-button"
      type="button"
      onClick={onOpen}
      aria-label={hasNew ? "What's new — unread updates" : "What's new"}
      title="What's new"
      style={{ color: hasNew ? c.brand : c.muted, boxShadow: "var(--shadow-surface)" }}
    >
      <Sparkles size={15} />
      {hasNew && <span className="eon-changelog-dot" style={{ background: c.brand }} aria-hidden="true" />}
    </button>
  );
}

export function HubChangelogDialog({ c, open, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const returnFocusTo = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
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

  const formatDate = (value) => new Date(`${value}T00:00:00`)
    .toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="What's new"
        className="eon-modal eon-changelog-dialog"
        style={{ background: c.nav, borderColor: c.border }}
      >
        <div className="eon-modal-head" style={{ borderColor: c.border }}>
          <span className="eon-changelog-mark" style={{ background: c.active, color: c.brand }}>
            <Sparkles size={15} />
          </span>
          <strong style={{ color: c.text }}>What's new</strong>
          <button
            className="eon-buttonish eon-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close changelog"
            style={{ color: c.muted }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="eon-modal-body eon-changelog-body">
          {CHANGELOG.map((entry) => (
            <section key={entry.date} className="eon-changelog-entry">
              <time dateTime={entry.date} style={{ color: c.muted }}>{formatDate(entry.date)}</time>
              <strong style={{ color: c.text }}>{entry.title}</strong>
              <ul>
                {entry.items.map((item) => <li key={item} style={{ color: c.secondary }}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
