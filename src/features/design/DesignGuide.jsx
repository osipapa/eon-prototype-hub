import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Download, Eye, EyeOff, Menu, PencilLine, Plus, X } from "lucide-react";
import DesignHubSwitcher from "@/components/DesignHubSwitcher";
import { HubChangelogDialog, useHubChangelog } from "@/components/HubChangelog";
import HubSidebarFooter from "@/components/HubSidebarFooter";
import SidebarResizeHandle, { useResizableSidebar } from "@/components/SidebarResizeHandle";
import { HUB } from "@/features/hub/prototypes";
import { useSystemTheme } from "@/lib/systemTheme";
import { zipFiles } from "@/lib/zip";
import { headings, okfBundle, parseRef, sortEntries } from "@kb/okf.js";
import DocsArticle from "./DocsArticle";
import DocsEditor from "./DocsEditor";
import DocsRefs from "./DocsRefs";
import DocsToc, { scrollToSection } from "./DocsToc";
import DocsTree from "./DocsTree";

export const DEFAULT_DESIGN_PAGE = "spacing";

const TYPE_LABEL = { concept: "Concept", howto: "How-to", reference: "Reference", decision: "Decision", metric: "Metric" };
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null);
const BLANK = { slug: "", type: "reference", title: "", summary: "", group_path: "", status: "published", body_md: "## Overview\n\n", refs: [], sort_order: 100 };

function downloadBundle(entries) {
  const blob = zipFiles(okfBundle(entries).map((file) => ({ path: `eon-design/${file.path}`, text: file.text })));
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: "eon-design-okf.zip" });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Eon Design: the team's knowledge base, read like a docs site. Pages are
   kb_entries rows (markdown), shared live and readable by the hub MCP. */
export default function DesignGuide({
  activeSlug,
  activeSection,
  kb,
  assets = {},
  logoLoading = false,
  userEmail,
  isAdmin,
  onSelectPage,
  onOpenPrototypes,
  onOpenPrompts,
  onOpenRoute,
  onOpenAdmin,
  onSignOut,
}) {
  const hubTheme = useSystemTheme();
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 900);
  const [showDrafts, setShowDrafts] = useState(false);
  const [editor, setEditor] = useState(null);
  const scrollRef = useRef(null);
  const c = HUB[hubTheme];
  const changelog = useHubChangelog();
  const sidebarResize = useResizableSidebar("eon-sidebar-width");
  const entries = kb.entries;
  const firstPublished = sortEntries(entries).find((item) => item.status !== "draft");
  const entry = entries.find((item) => item.slug === activeSlug) || entries.find((item) => item.slug === DEFAULT_DESIGN_PAGE) || firstPublished;
  const toc = useMemo(() => headings(entry?.body_md), [entry?.body_md]);
  const editable = kb.source !== "loading";

  useEffect(() => {
    const update = () => {
      const nextNarrow = window.innerWidth <= 900;
      setNarrow(nextNarrow);
      if (!nextNarrow) setNavOpen(true);
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Land on the linked section, or the top of a newly opened page.
  useEffect(() => {
    if (activeSection) {
      const timer = setTimeout(() => scrollToSection(activeSection), 60);
      return () => clearTimeout(timer);
    }
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    return undefined;
  }, [entry?.slug, activeSection]);

  const navigateProduct = (product) => {
    if (product === "prototypes") onOpenPrototypes?.();
    if (product === "prompts") onOpenPrompts?.();
  };

  const selectPage = (slug, section) => {
    onSelectPage?.(slug, section);
    if (narrow) setNavOpen(false);
  };

  const openRef = (ref) => {
    const { slug, anchor } = parseRef(ref);
    if (slug === entry?.slug && anchor) scrollToSection(anchor);
    else selectPage(slug, anchor);
  };

  const saveEditor = async (draft) => {
    const saved = await kb.save(draft, editor.mode === "edit" ? editor.entry : null);
    setEditor(null);
    if (saved.slug !== entry?.slug) selectPage(saved.slug);
  };

  const deleteEntry = async (target) => {
    await kb.remove(target);
    setEditor(null);
    selectPage(firstPublished?.slug === target.slug ? DEFAULT_DESIGN_PAGE : firstPublished?.slug);
  };

  if (!entry) return null;
  const crumbs = entry.group_path ? entry.group_path.split("/") : [];

  return (
    <div className={`${hubTheme === "dark" ? "" : "light"} eon-design-workspace`} style={{ background: c.bg, color: c.text }}>
      {narrow && navOpen && <button className="eon-drawer-scrim" type="button" aria-label="Close Eon Design navigation" onClick={() => setNavOpen(false)} />}
      {navOpen && (
        <aside
          className="eon-prompt-sidebar eon-design-sidebar"
          role={narrow ? "dialog" : "navigation"}
          aria-modal={narrow || undefined}
          aria-label="Eon Design navigation"
          style={{ background: c.nav, borderColor: c.border, ...(!narrow ? { width: sidebarResize.width, flexBasis: sidebarResize.width } : {}) }}
        >
          {!narrow && <SidebarResizeHandle resize={sidebarResize} label="Resize Eon Design navigation" />}
          <div className="eon-design-sidebar-head" style={{ borderColor: c.border }}>
            <div className="eon-brand-row">
              <DesignHubSwitcher active="design" c={c} logo={assets.eonLogo} logoLoading={logoLoading} onSelect={navigateProduct} />
              {narrow && <button className="eon-buttonish eon-icon-button" type="button" onClick={() => setNavOpen(false)} aria-label="Close Eon Design navigation" style={{ color: c.muted }}><X size={17} /></button>}
            </div>
          </div>
          <div className="eon-design-sidebar-scroll">
            <DocsTree entries={entries} activeSlug={entry.slug} showDrafts={showDrafts} c={c} onSelect={selectPage} />
          </div>
          <div className="eon-docs-sidebar-actions" style={{ borderColor: c.border }}>
            <button className="eon-buttonish" type="button" disabled={!editable} onClick={() => setEditor({ mode: "new", entry: { ...BLANK, group_path: entry.group_path } })} style={{ color: c.secondary }}>
              <Plus size={14} aria-hidden="true" /> New page
            </button>
            <button className="eon-buttonish" type="button" aria-pressed={showDrafts} onClick={() => setShowDrafts((value) => !value)} title={showDrafts ? "Hide drafts" : "Show drafts"} aria-label={showDrafts ? "Hide drafts" : "Show drafts"} style={{ color: showDrafts ? c.text : c.muted }}>
              {showDrafts ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />} Drafts
            </button>
            <button className="eon-buttonish" type="button" onClick={() => downloadBundle(entries)} title="Download every published page as an Open Knowledge Format bundle (okf.md)" aria-label="Download OKF bundle" style={{ color: c.muted }}>
              <Download size={14} aria-hidden="true" /> OKF
            </button>
          </div>
          <HubSidebarFooter c={c} userEmail={userEmail} isAdmin={isAdmin} onOpenAdmin={onOpenAdmin} onSignOut={onSignOut} changelog={changelog} />
        </aside>
      )}

      <main className="eon-design-main">
        <header className="eon-prompt-toolbar" style={{ background: c.nav, borderColor: c.border }}>
          {narrow && !navOpen && (
            <button className="eon-buttonish eon-icon-button" type="button" onClick={() => setNavOpen(true)} aria-label="Open Eon Design navigation" style={{ color: c.muted, boxShadow: "var(--shadow-surface)" }}><Menu size={17} /></button>
          )}
          <nav className="eon-prompt-breadcrumbs" aria-label="Breadcrumb">
            <span style={{ color: c.muted }}>Eon Design</span>
            {crumbs.map((crumb) => (
              <span key={crumb} className="eon-docs-crumb"><ChevronRight size={13} aria-hidden="true" style={{ color: c.muted }} /><span style={{ color: c.muted }}>{crumb}</span></span>
            ))}
            <ChevronRight size={13} aria-hidden="true" style={{ color: c.muted }} />
            <strong>{entry.title}</strong>
          </nav>
          <button className="eon-buttonish eon-docs-button eon-docs-edit" type="button" disabled={!editable} onClick={() => setEditor({ mode: "edit", entry })} style={{ color: c.secondary, boxShadow: "var(--shadow-surface)" }}>
            <PencilLine size={14} aria-hidden="true" /> Edit
          </button>
        </header>
        <div className="eon-design-scroll" ref={scrollRef}>
          <div className="eon-docs-page">
            <article className="eon-docs-article" key={entry.slug}>
              <header className="eon-docs-hero">
                <h1>{entry.title}</h1>
                {entry.summary && <p className="eon-docs-lead" style={{ color: c.secondary }}>{entry.summary}</p>}
                <p className="eon-docs-meta" style={{ color: c.muted }}>
                  <span style={{ background: c.active, color: c.secondary }}>{TYPE_LABEL[entry.type] || entry.type}</span>
                  {entry.status === "draft" && <span style={{ background: c.active, color: c.secondary }}>Draft</span>}
                  {formatDate(entry.updated_at) && <>Updated {formatDate(entry.updated_at)}</>}
                </p>
              </header>
              <DocsArticle entry={entry} c={c} onOpenRef={openRef} onOpenRoute={onOpenRoute} onOpenPrompts={onOpenPrompts} />
              <DocsRefs entry={entry} entries={entries} c={c} onOpenRef={openRef} />
            </article>
            <aside className="eon-docs-toc-rail">
              <DocsToc items={toc} scrollRef={scrollRef} c={c} />
            </aside>
          </div>
        </div>
      </main>
      {editor && (
        <DocsEditor
          entry={editor.entry}
          entries={entries}
          isNew={editor.mode === "new"}
          isAdmin={isAdmin}
          c={c}
          onSave={saveEditor}
          onDelete={deleteEntry}
          onClose={() => setEditor(null)}
          onOpenPrompts={onOpenPrompts}
        />
      )}
      <HubChangelogDialog c={c} open={changelog.isOpen} onClose={changelog.close} newSince={changelog.newSince} />
    </div>
  );
}
