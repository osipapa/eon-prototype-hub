import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, Boxes, Check, ChevronDown, ChevronRight, ExternalLink,
  FileCheck2, FolderOpen, Lightbulb, Menu, MessageSquareText, Milestone,
  MousePointer2, Shapes, Sparkles, Workflow, X,
} from "lucide-react";
import DesignHubSwitcher from "@/components/DesignHubSwitcher";
import { HubChangelogDialog, useHubChangelog } from "@/components/HubChangelog";
import HubSidebarFooter from "@/components/HubSidebarFooter";
import SidebarResizeHandle, { useResizableSidebar } from "@/components/SidebarResizeHandle";
import { HUB } from "@/features/hub/prototypes";
import { useSystemTheme } from "@/lib/systemTheme";

const PAGE_GROUPS = [
  {
    label: "Get started",
    pages: [
      { slug: "overview", title: "Overview", Icon: Shapes },
      { slug: "principles", title: "Design principles", Icon: Sparkles },
    ],
  },
  {
    label: "How we work",
    pages: [
      { slug: "product-process", title: "Product design process", Icon: Workflow },
      { slug: "design-review", title: "Design review", Icon: MessageSquareText },
      { slug: "linear-handoff", title: "Linear handoff", Icon: FileCheck2 },
    ],
  },
  {
    label: "Resources",
    pages: [
      { slug: "common-files", title: "Common files & tools", Icon: FolderOpen },
    ],
  },
];

const ALL_PAGES = PAGE_GROUPS.flatMap((group) => group.pages);

const PAGE_CONTENT = {
  overview: {
    kicker: "Eon Design",
    title: "Designing Eon, together",
    summary: "The shared home for how we shape product ideas, collaborate across disciplines, and hand work off with confidence.",
    sections: [
      {
        id: "purpose",
        title: "One place for the work around the work",
        body: "Eon Design connects the standards and operating practices that sit around individual files. It gives product, design, engineering, and operations a shared view of what good collaboration looks like.",
        cards: [
          { title: "Principles", body: "The qualities we want every Eon experience to express.", icon: Sparkles, to: "principles" },
          { title: "Ways of working", body: "A practical path from framing through learning.", icon: Workflow, to: "product-process" },
          { title: "Delivery", body: "Review and Linear handoff practices that reduce ambiguity.", icon: FileCheck2, to: "linear-handoff" },
          { title: "Resources", body: "Common destinations for files, tools, and shared references.", icon: FolderOpen, to: "common-files" },
        ],
      },
      {
        id: "path",
        title: "A shared path from idea to learning",
        body: "The process is intentionally lightweight. Use the parts that improve clarity for the work; do not turn it into a ceremony checklist.",
        steps: [
          ["Frame", "Align on the customer problem, evidence, constraints, and decision owner."],
          ["Explore", "Compare credible directions and make tradeoffs visible early."],
          ["Prototype", "Use the prototype hub to test behavior, states, and edge cases."],
          ["Deliver", "Connect final design intent to a ready Linear issue and review together."],
          ["Learn", "Validate the outcome with customer evidence and Mixpanel signals."],
        ],
      },
    ],
  },
  principles: {
    kicker: "Get started",
    title: "Eon design principles",
    summary: "A starting point for decisions when requirements, patterns, or opinions compete.",
    sections: [
      {
        id: "principles",
        title: "What our experiences should feel like",
        body: "These principles are broad enough to travel across products while remaining concrete enough to guide critiques and tradeoffs.",
        cards: [
          { title: "Make the next step clear", body: "Prioritize the decision or action in front of the customer. Reveal depth as it becomes useful.", icon: MousePointer2 },
          { title: "Earn confidence", body: "Show status, consequences, and recovery paths. Never make people guess whether important work was saved.", icon: Check },
          { title: "Design the whole journey", body: "Include empty, loading, error, permission, and return states—not only the ideal path.", icon: Boxes },
          { title: "Prefer useful momentum", body: "Reduce handoffs and repeated work while keeping people in control of consequential actions.", icon: Milestone },
        ],
      },
      {
        id: "using-principles",
        title: "Use principles to resolve a tradeoff",
        body: "Name the tension, identify which principle matters most for this moment, and explain what the decision optimizes. Principles should sharpen judgment—not replace it.",
        checklist: [
          "Describe the customer and the decision they are trying to make.",
          "State the competing needs or constraints in plain language.",
          "Use evidence to choose which principle has priority here.",
          "Record the tradeoff so later reviewers understand the intent.",
        ],
      },
    ],
  },
  "product-process": {
    kicker: "How we work",
    title: "Product design process",
    summary: "A flexible operating model for moving from an unclear opportunity to an observable customer outcome.",
    sections: [
      {
        id: "shape",
        title: "Shape the problem before the solution",
        body: "Start with the customer behavior or business condition that needs to change. A useful brief names the evidence, target customer, constraints, success signal, and unresolved questions.",
        checklist: [
          "Link the source evidence and the owning Linear initiative or project.",
          "Write the desired outcome without prescribing a screen or component.",
          "Name the decision owner and the people needed for review.",
          "Agree on how the team will know the change worked.",
        ],
      },
      {
        id: "make",
        title: "Make, test, and narrow",
        body: "Explore enough range to understand the trade space, then use the smallest realistic artifact that answers the riskiest question.",
        steps: [
          ["Diverge", "Create meaningfully different approaches, not cosmetic variants."],
          ["Critique", "Review against the brief, principles, evidence, and technical constraints."],
          ["Prototype", "Model the critical interaction and non-happy-path states."],
          ["Validate", "Put the artifact in front of the people or data that can reduce uncertainty."],
          ["Commit", "Record the chosen direction and the tradeoffs the team accepted."],
        ],
      },
    ],
  },
  "design-review": {
    kicker: "How we work",
    title: "Design review",
    summary: "Use reviews to improve the decision, not to perform a final approval ritual.",
    sections: [
      {
        id: "review-types",
        title: "Match the review to the maturity of the work",
        cards: [
          { title: "Direction review", body: "Early: align on the problem, options, and the riskiest assumptions.", icon: Lightbulb },
          { title: "Interaction review", body: "Middle: inspect flows, system behavior, states, and content together.", icon: MousePointer2 },
          { title: "Delivery review", body: "Late: confirm responsive behavior, accessibility, edge cases, and handoff readiness.", icon: FileCheck2 },
        ],
      },
      {
        id: "review-ready",
        title: "Bring enough context for useful feedback",
        body: "A reviewer should understand the decision you need without reconstructing the project history.",
        checklist: [
          "State the customer problem and what changed since the last review.",
          "Call out the specific question or decision needed today.",
          "Link the prototype and show important states in context.",
          "Separate blocking concerns from follow-up improvements.",
          "Close the loop by recording the decision and owner.",
        ],
      },
    ],
  },
  "linear-handoff": {
    kicker: "Delivery",
    title: "Linear handoff",
    summary: "A shared contract for turning design intent into work that engineering can confidently plan, build, and verify.",
    sections: [
      {
        id: "ready",
        title: "Definition of ready for design handoff",
        body: "Linking a Figma file is not the handoff. The issue should preserve intent, behavior, decisions, and validation criteria in one connected package.",
        checklist: [
          "Outcome: explain the customer or business result this work should produce.",
          "Scope: list included behavior and explicitly name what is out of scope.",
          "Design: link the canonical Figma frame and the relevant interactive prototype.",
          "States: cover loading, empty, error, permission, responsive, and recovery behavior.",
          "Content: mark final copy and note any localization or dynamic-content constraints.",
          "Analytics: link the event contract or explain why no tracking change is needed.",
          "Acceptance: describe observable behavior that design and engineering can verify together.",
        ],
      },
      {
        id: "ownership",
        title: "Handoff is a conversation",
        body: "Walk the issue together before implementation starts. Keep design available for questions, review the built behavior in its real environment, and update the issue when decisions change.",
        steps: [
          ["Prepare", "Designer brings the issue, canonical frames, prototype, and open questions."],
          ["Walk through", "Design and engineering inspect behavior, constraints, and implementation risks."],
          ["Commit", "The issue owner records decisions and splits follow-up work where needed."],
          ["Review build", "Verify the integrated experience against acceptance criteria and principles."],
        ],
      },
    ],
  },
  "common-files": {
    kicker: "Resources",
    title: "Common files & tools",
    summary: "The stable entry points the team returns to. Add workspace-specific URLs here as shared destinations become canonical.",
    sections: [
      {
        id: "live-tools",
        title: "Eon Design tools",
        resources: [
          { title: "Prototype hub", body: "Build, review, comment on, and share interactive product work.", to: "prototypes" },
          { title: "Prompt library", body: "Reusable prompts and templates for design and delivery work.", to: "prompts" },
          { title: "Mixpanel guide", body: "Implementation contract, setup prompt, and QA guidance.", to: "tracking" },
        ],
      },
      {
        id: "shared-destinations",
        title: "Shared destinations to connect",
        body: "These slots define the intended information architecture without inventing team URLs. Replace each slot when its canonical destination is agreed.",
        resources: [
          { title: "Figma libraries", body: "Published product libraries, foundations, and shared components.", pending: true },
          { title: "Linear workspace", body: "Initiatives, product projects, delivery cycles, and issue templates.", pending: true },
          { title: "Research repository", body: "Customer evidence, studies, interview notes, and insight summaries.", pending: true },
          { title: "Product strategy", body: "Vision, priorities, operating metrics, and current bets.", pending: true },
        ],
      },
    ],
  },
};

export default function DesignGuide({
  activeSlug,
  assets = {},
  userEmail,
  isAdmin,
  onSelectPage,
  onOpenPrototypes,
  onOpenPrompts,
  onOpenTracking,
  onOpenAdmin,
  onSignOut,
}) {
  const hubTheme = useSystemTheme();
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 900);
  const c = HUB[hubTheme];
  const changelog = useHubChangelog();
  const sidebarResize = useResizableSidebar("eon-sidebar-width");
  const page = PAGE_CONTENT[activeSlug] || PAGE_CONTENT.overview;
  const pageRecord = ALL_PAGES.find((item) => item.slug === activeSlug) || ALL_PAGES[0];

  useEffect(() => {
    const update = () => {
      const nextNarrow = window.innerWidth <= 900;
      setNarrow(nextNarrow);
      if (!nextNarrow) setNavOpen(true);
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const navigateProduct = (product) => {
    if (product === "prototypes") onOpenPrototypes?.();
    if (product === "prompts") onOpenPrompts?.();
    if (product === "tracking") onOpenTracking?.();
  };

  const selectPage = (nextPage) => {
    onSelectPage?.(nextPage);
    if (narrow) setNavOpen(false);
  };

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
              <DesignHubSwitcher active="design" c={c} logo={assets.eonLogo} onSelect={navigateProduct} />
              {narrow && <button className="eon-buttonish eon-icon-button" type="button" onClick={() => setNavOpen(false)} aria-label="Close Eon Design navigation" style={{ color: c.muted }}><X size={17} /></button>}
            </div>
          </div>
          <div className="eon-design-sidebar-scroll">
            {PAGE_GROUPS.map((group) => (
              <DesignNavGroup key={group.label} group={group} activeSlug={pageRecord.slug} c={c} onSelect={selectPage} />
            ))}
          </div>
          <HubSidebarFooter c={c} userEmail={userEmail} isAdmin={isAdmin} onOpenAdmin={onOpenAdmin} onSignOut={onSignOut} changelog={changelog} />
        </aside>
      )}

      <main className="eon-design-main">
        <header className="eon-prompt-toolbar" style={{ background: c.nav, borderColor: c.border }}>
          {narrow && !navOpen && (
            <button className="eon-buttonish eon-icon-button" type="button" onClick={() => setNavOpen(true)} aria-label="Open Eon Design navigation" style={{ color: c.muted, boxShadow: "var(--shadow-surface)" }}><Menu size={17} /></button>
          )}
          <div className="eon-prompt-breadcrumbs" aria-label="Current Eon Design page">
            <span style={{ color: c.muted }}>Eon Design</span>
            <ChevronRight size={13} aria-hidden="true" style={{ color: c.muted }} />
            <strong>{pageRecord.title}</strong>
          </div>
        </header>
        <div className="eon-design-scroll">
          <div className="eon-design-page">
            <article className="eon-design-article">
              <header className="eon-design-hero">
                <span style={{ color: c.brand }}>{page.kicker}</span>
                <h1>{page.title}</h1>
                <p style={{ color: c.secondary }}>{page.summary}</p>
              </header>
              {page.sections.map((section) => (
                <DesignSection key={section.id} section={section} c={c} onSelectPage={selectPage} navigateProduct={navigateProduct} />
              ))}
            </article>
            <aside className="eon-design-toc" aria-label="On this page">
              <div style={{ borderColor: c.border }}>
                <strong>On this page</strong>
                {page.sections.map((section) => <a key={section.id} href={`#${section.id}`} style={{ color: c.muted }}>{section.title}</a>)}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <HubChangelogDialog c={c} open={changelog.isOpen} onClose={changelog.close} />
    </div>
  );
}

function DesignNavGroup({ group, activeSlug, c, onSelect }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="eon-design-nav-group">
      <button className="eon-buttonish eon-design-nav-group-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} style={{ color: c.muted }}>
        <ChevronDown className={open ? "" : "is-collapsed"} size={14} aria-hidden="true" />
        {group.label}
      </button>
      {open && group.pages.map((page) => {
        const selected = page.slug === activeSlug;
        return (
          <button key={page.slug} className="eon-buttonish eon-design-nav-item" type="button" onClick={() => onSelect(page)} aria-current={selected ? "page" : undefined} style={{ background: selected ? c.active : "transparent", color: selected ? c.text : c.secondary }}>
            <page.Icon size={15} aria-hidden="true" style={{ color: selected ? c.brand : c.muted }} />
            <span>{page.title}</span>
          </button>
        );
      })}
    </section>
  );
}

function DesignSection({ section, c, onSelectPage, navigateProduct }) {
  return (
    <section className="eon-design-section" id={section.id}>
      <h2>{section.title}</h2>
      {section.body && <p className="eon-design-section-intro" style={{ color: c.secondary }}>{section.body}</p>}
      {section.cards && (
        <div className="eon-design-card-grid">
          {section.cards.map((card) => (
            <button key={card.title} className="eon-buttonish eon-design-card" type="button" disabled={!card.to} onClick={() => card.to && onSelectPage(ALL_PAGES.find((page) => page.slug === card.to))} style={{ background: c.panel, boxShadow: "var(--shadow-surface)", color: c.text }}>
              <span style={{ background: c.active, color: c.brand }}><card.icon size={18} aria-hidden="true" /></span>
              <strong>{card.title}</strong>
              <p style={{ color: c.secondary }}>{card.body}</p>
              {card.to && <ArrowRight size={16} aria-hidden="true" style={{ color: c.muted }} />}
            </button>
          ))}
        </div>
      )}
      {section.steps && (
        <ol className="eon-design-steps">
          {section.steps.map(([title, body], index) => (
            <li key={title}>
              <span style={{ background: c.active, color: c.brand }}>{index + 1}</span>
              <div><strong>{title}</strong><p style={{ color: c.secondary }}>{body}</p></div>
            </li>
          ))}
        </ol>
      )}
      {section.checklist && (
        <ul className="eon-design-checklist" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
          {section.checklist.map((item) => <li key={item}><span style={{ background: c.active, color: c.brand }}><Check size={14} /></span><p>{item}</p></li>)}
        </ul>
      )}
      {section.resources && (
        <div className="eon-design-resources">
          {section.resources.map((resource) => (
            <button key={resource.title} className="eon-buttonish" type="button" disabled={resource.pending} onClick={() => resource.to && navigateProduct(resource.to)} style={{ background: c.panel, boxShadow: "var(--shadow-surface)", color: c.text }}>
              <span className="eon-design-resource-icon" style={{ background: c.active, color: c.brand }}><BookOpen size={17} /></span>
              <span><strong>{resource.title}</strong><small style={{ color: c.secondary }}>{resource.body}</small></span>
              {resource.pending ? <em style={{ color: c.muted }}>Link needed</em> : <ExternalLink size={15} style={{ color: c.muted }} />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
