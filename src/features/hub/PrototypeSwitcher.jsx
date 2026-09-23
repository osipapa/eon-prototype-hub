import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

const RECENT_KEY = "eon-recent-prototypes";

function readRecent() {
  try { return JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}

export function rememberRecent(id) {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((item) => item !== id)].slice(0, 6))); }
  catch { /* Recents are a convenience; the switcher still searches. */ }
}

export const SHORTCUT_MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl ";

/* ⌘K: jump to any prototype by title, group, or Linear ticket. With nothing
   typed, the ones you opened last come first. The footer lists the canvas
   shortcuts, which is also where people find out they exist. */
export default function PrototypeSwitcher({ c, projects, identifierFor, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return projects.filter((item) =>
        `${item.title} ${item.group_name || ""} ${identifierFor(item) || ""}`.toLowerCase().includes(q)).slice(0, 12);
    }
    const recent = readRecent().map((id) => projects.find((item) => item.id === id)).filter(Boolean);
    return [...recent, ...projects.filter((item) => !recent.includes(item))].slice(0, 12);
  }, [query, projects, identifierFor]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => { listRef.current?.children[index]?.scrollIntoView({ block: "nearest" }); }, [index]);
  useEffect(() => {
    const previous = document.activeElement;
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") setIndex((current) => Math.min(items.length - 1, current + 1));
    else if (event.key === "ArrowUp") setIndex((current) => Math.max(0, current - 1));
    else if (event.key === "Enter") { if (items[index]) onPick(items[index]); }
    else if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    else if (event.key !== "Tab") return;
    event.preventDefault();
  };

  return (
    <div className="eon-switcher-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="eon-switcher" role="dialog" aria-modal="true" aria-label="Go to a prototype"
        style={{ background: c.panel, borderColor: c.border, color: c.text }}>
        <div className="eon-switcher-field" style={{ borderColor: c.border }}>
          <Search size={15} aria-hidden="true" style={{ color: c.muted }} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKeyDown}
            placeholder="Go to a prototype…" role="combobox" aria-expanded="true" aria-autocomplete="list"
            aria-controls="eon-switcher-list" aria-activedescendant={items[index] ? `eon-switcher-${items[index].id}` : undefined}
            style={{ color: c.text }} />
        </div>
        <ul id="eon-switcher-list" ref={listRef} role="listbox" aria-label="Prototypes">
          {items.map((item, itemIndex) => (
            <li key={item.id} id={`eon-switcher-${item.id}`} role="option" aria-selected={itemIndex === index}
              onMouseMove={() => setIndex(itemIndex)} onClick={() => onPick(item)}
              style={{ background: itemIndex === index ? c.active : "transparent" }}>
              <span className="eon-switcher-title">{item.title}</span>
              <span className="eon-switcher-meta" style={{ color: c.muted }}>{identifierFor(item) || item.group_name || "General"}</span>
            </li>
          ))}
          {!items.length && <li className="eon-switcher-empty" style={{ color: c.muted }}>Nothing matches “{query.trim()}”</li>}
        </ul>
        <p className="eon-switcher-keys" style={{ color: c.muted, borderColor: c.border }}>
          <kbd>←</kbd> <kbd>→</kbd> states · <kbd>1</kbd> to <kbd>4</kbd> device · <kbd>G</kbd> grid · <kbd>T</kbd> theme · <kbd>F</kbd> full view
        </p>
      </div>
    </div>
  );
}
