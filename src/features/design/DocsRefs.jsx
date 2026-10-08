import { ArrowUpRight, CornerDownLeft } from "lucide-react";
import { backlinks, headings, parseRef } from "@kb/okf.js";

const sectionTitle = (entry, anchor) => headings(entry?.body_md).find((h) => h.id === anchor)?.text;

/* Footer of a page: the pages it points to (refs) and the pages that point
   back to it, so a token page shows where it is relied on. */
export default function DocsRefs({ entry, entries, c, onOpenRef }) {
  const bySlug = new Map(entries.map((item) => [item.slug, item]));
  const related = (entry.refs ?? []).map((ref) => ({ ref, ...parseRef(ref) })).filter((ref) => bySlug.has(ref.slug));
  const usedIn = backlinks(entries, entry.slug);
  if (!related.length && !usedIn.length) return null;

  const Row = ({ to, title, detail, icon: Icon }) => (
    <li>
      <button className="eon-buttonish" type="button" onClick={() => onOpenRef(to)} style={{ background: c.panel, boxShadow: "var(--shadow-surface)", color: c.text }}>
        <span><strong>{title}</strong>{detail && <small style={{ color: c.muted }}>{detail}</small>}</span>
        <Icon size={15} aria-hidden="true" style={{ color: c.muted }} />
      </button>
    </li>
  );

  return (
    <footer className="eon-docs-refs" style={{ borderColor: c.border }}>
      {related.length > 0 && (
        <section>
          <h2>Related</h2>
          <ul>
            {related.map(({ ref, slug, anchor }) => (
              <Row key={ref} to={ref} title={bySlug.get(slug).title} detail={anchor ? sectionTitle(bySlug.get(slug), anchor) || anchor : bySlug.get(slug).group_path} icon={ArrowUpRight} />
            ))}
          </ul>
        </section>
      )}
      {usedIn.length > 0 && (
        <section>
          <h2>Used in</h2>
          <ul>
            {usedIn.map(({ entry: from, anchors }) => (
              <Row
                key={from.slug}
                to={from.slug}
                title={from.title}
                detail={anchors.filter(Boolean).map((anchor) => sectionTitle(entry, anchor) || anchor).join(", ") || from.group_path}
                icon={CornerDownLeft}
              />
            ))}
          </ul>
        </section>
      )}
    </footer>
  );
}
