import { useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { sortEntries } from "@kb/okf.js";

const COLLAPSED_KEY = "eon-docs-collapsed";
const readCollapsed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) || "[]")); } catch { return new Set(); }
};

// Groups nest on "/" in group_path: "Foundations/Color" sits inside Foundations.
function buildTree(entries) {
  const root = { name: "", path: "", groups: new Map(), pages: [] };
  for (const entry of sortEntries(entries)) {
    let node = root;
    for (const part of (entry.group_path || "General").split("/").map((p) => p.trim()).filter(Boolean)) {
      const path = node.path ? `${node.path}/${part}` : part;
      if (!node.groups.has(part)) node.groups.set(part, { name: part, path, groups: new Map(), pages: [] });
      node = node.groups.get(part);
    }
    node.pages.push(entry);
  }
  return root;
}

const matches = (entry, query) => `${entry.title} ${entry.summary} ${entry.group_path} ${entry.body_md}`.toLowerCase().includes(query);

/* The page tree on the left: collapsible groups, the open page highlighted,
   and a filter that searches page text as well as titles. */
export default function DocsTree({ entries, activeSlug, showDrafts, c, onSelect }) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => entries.filter((entry) => (showDrafts || entry.status !== "draft" || entry.slug === activeSlug) && (!q || matches(entry, q))),
    [entries, showDrafts, activeSlug, q],
  );
  const tree = useMemo(() => buildTree(visible), [visible]);

  const toggle = (path) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next])); } catch { /* per-viewer convenience only */ }
      return next;
    });
  };

  const renderGroup = (group, depth) => {
    const open = q || !collapsed.has(group.path);
    return (
      <li key={group.path} className="eon-docs-tree-group">
        <button className="eon-buttonish eon-docs-tree-toggle" type="button" aria-expanded={Boolean(open)} onClick={() => toggle(group.path)} style={{ color: c.text, paddingLeft: 8 + depth * 14 }}>
          <ChevronRight size={14} aria-hidden="true" className={open ? "is-open" : ""} style={{ color: c.muted }} />
          <span>{group.name}</span>
        </button>
        {open && (
          <ul>
            {[...group.groups.values()].map((child) => renderGroup(child, depth + 1))}
            {group.pages.map((entry) => {
              const active = entry.slug === activeSlug;
              return (
                <li key={entry.slug}>
                  <button
                    className="eon-buttonish eon-docs-tree-item"
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(entry.slug)}
                    style={{ paddingLeft: 30 + depth * 14, background: active ? c.active : "transparent", color: active ? c.text : c.secondary, boxShadow: active ? `inset 2px 0 0 ${c.brand}` : "none" }}
                  >
                    <span>{entry.title}</span>
                    {entry.status === "draft" && <em style={{ color: c.muted }}>Draft</em>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="eon-docs-tree">
      <label className="eon-docs-filter" style={{ background: c.raised, color: c.muted }}>
        <Search size={14} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages" aria-label="Search Eon Design pages" style={{ color: c.text }} />
        {query && <button className="eon-buttonish" type="button" aria-label="Clear search" onClick={() => setQuery("")} style={{ color: c.muted }}><X size={13} /></button>}
      </label>
      {visible.length ? (
        <ul className="eon-docs-tree-root">{[...tree.groups.values()].map((group) => renderGroup(group, 0))}</ul>
      ) : (
        <p className="eon-docs-tree-empty" style={{ color: c.muted }}>No pages match “{query}”.</p>
      )}
    </div>
  );
}
