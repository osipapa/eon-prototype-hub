import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CHANGELOG, CHANGELOG_SEEN_KEY, changelogCount, changelogGroups,
  latestChangelogDate, markChangelogSeen, readSeenChangelogDate,
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
      aria-label={hasNew ? "What's new. Unread updates" : "What's new"}
      title="What's new"
      style={{ color: hasNew ? c.brand : c.muted, boxShadow: "var(--shadow-surface)" }}
    >
      <Sparkles className="eon-accent-icon" size={15} />
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

  const formatDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return {
      month: date.toLocaleDateString(undefined, { month: "short" }),
      day: date.toLocaleDateString(undefined, { day: "2-digit" }),
      year: date.toLocaleDateString(undefined, { year: "numeric" }),
      full: date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
    };
  };

  const updateCount = CHANGELOG.reduce((total, entry) => total + changelogCount(entry), 0);

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eon-changelog-title"
        aria-describedby="eon-changelog-summary"
        className="eon-modal eon-changelog-dialog"
        style={{ background: c.nav, borderColor: c.border, "--changelog-accent": c.brand }}
      >
        <div className="eon-modal-head" style={{ borderColor: c.border }}>
          <span className="eon-changelog-mark eon-accent-icon" style={{ background: c.active, color: c.brand }}>
            <Sparkles size={15} />
          </span>
          <div className="eon-changelog-heading">
            <strong id="eon-changelog-title" style={{ color: c.text }}>What's new</strong>
            <span id="eon-changelog-summary" style={{ color: c.muted }}>
              {CHANGELOG.length} releases · {updateCount} improvements
            </span>
          </div>
          <button
            className="eon-buttonish eon-icon-button eon-changelog-close"
            type="button"
            onClick={onClose}
            aria-label="Close changelog"
            style={{ background: c.raised, color: c.muted, boxShadow: "var(--shadow-surface)" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="eon-modal-body eon-changelog-body">
          {CHANGELOG.map((entry, index) => {
            const date = formatDate(entry.date);
            const isLatest = index === 0;
            return (
              <section
                key={entry.date}
                className={`eon-changelog-entry${isLatest ? " is-latest" : ""}`}
                style={{ "--entry-index": index }}
              >
                <time className="eon-changelog-date" dateTime={entry.date} aria-label={date.full} style={{ color: c.muted }}>
                  <span>{date.month}</span>
                  <strong style={{ color: isLatest ? c.text : c.secondary }}>{date.day}</strong>
                  <em>{date.year}</em>
                </time>
                <div className="eon-changelog-rail" aria-hidden="true">
                  <span style={{ background: isLatest ? c.brand : c.muted }} />
                  <i style={{ background: c.border }} />
                </div>
                <article className="eon-changelog-card" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
                  <header>
                    <div>
                      {isLatest && (
                        <Badge className="eon-changelog-latest" style={{ background: c.active, color: c.brand }}>
                          Latest
                        </Badge>
                      )}
                      <span style={{ color: c.muted }}>{changelogCount(entry)} updates</span>
                    </div>
                    <h2 style={{ color: c.text }}>{entry.title}</h2>
                  </header>
                  {entry.image && (
                    <figure className="eon-changelog-shot" style={{ background: c.raised, borderColor: c.border }}>
                      <img src={`${import.meta.env.BASE_URL}${entry.image}`} alt={entry.imageAlt || ""} decoding="async" />
                      {entry.imageAlt && <figcaption style={{ color: c.muted }}>{entry.imageAlt}</figcaption>}
                    </figure>
                  )}
                  {changelogGroups(entry).map((group) => (
                    <div key={group.label || "all"} className="eon-changelog-group">
                      {group.label && <h3 style={{ color: c.muted }}>{group.label}</h3>}
                      <ul style={{ color: c.secondary }}>
                        {group.items.map((item) => (
                          <li key={item} style={{ "--bullet": c.muted }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </article>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
