import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, Boxes, Check, ChevronDown, ChevronRight, ExternalLink,
  FileCheck2, FolderOpen, GitBranch, Lightbulb, ListChecks, Menu,
  MessageSquareText, Milestone, MousePointer2, ShieldCheck, Sparkles,
  Workflow, X,
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
      { slug: "overview", title: "Overview" },
      { slug: "principles", title: "Design principles" },
    ],
  },
  {
    label: "How we work",
    pages: [
      { slug: "product-process", title: "Product design process" },
      { slug: "design-review", title: "Design review" },
    ],
  },
  {
    label: "Resources",
    pages: [
      { slug: "linear-handoff", title: "Linear handoff" },
      { slug: "common-files", title: "Common files & tools" },
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
    kicker: "Resources",
    title: "Linear handoff",
    summary: "The board flow, ownership rules, and review gates that carry design work from an idea through Engineering QA.",
    sections: [
      {
        id: "board-flow",
        title: "From idea to Engineering QA",
        body: "The columns below mirror the live Design and Engineering workflows. The card remains the source of truth throughout the process; ownership changes at explicit gates, but the designer stays connected through Engineering QA.",
        linearFlow: {
          source: "Live Eon Linear workflows · Design + Engineering",
          ticket: {
            id: "DES-###",
            template: "Feature template",
            title: "Add a clear scroll affordance to the vehicle carousel",
            meta: ["High", "1 point", "Customer app"],
            context: ["Problem + evidence", "Scope + non-goals", "Figma + prototype", "States + analytics", "Acceptance criteria"],
          },
          columns: [
            {
              board: "Design", status: "Ideas", type: "Backlog", color: "#bec2c8", owner: "Team leads",
              state: "Opportunity captured",
              action: "Add early work with the customer problem, evidence, and expected outcome.",
              exit: "The opportunity is clear enough to prioritize.",
            },
            {
              board: "Design", status: "Backlog", type: "Backlog", color: "#bec2c8", owner: "Team leaders",
              state: "Prioritized",
              action: "Organize, compare, and sequence the work against current priorities.",
              exit: "The team has committed to design the work next.",
            },
            {
              board: "Design", status: "Todo", type: "Unstarted", color: "#e2e2e2", owner: "Rei",
              state: "Committed",
              action: "Move the selected card into Todo and confirm the assignee and required context.",
              exit: "A designer is ready to begin execution.",
            },
            {
              board: "Design", status: "In Progress", type: "Started", color: "#f2c94c", owner: "Assigned designer",
              state: "Design active",
              action: "Run the regular design, critique, prototype, and validation cycles.",
              exit: "The design is ready for cross-functional approval.",
            },
            {
              board: "Design", status: "Needs Review", type: "Started", color: "#f2c94c", owner: "Designer + reviewers",
              state: "Approval gate",
              action: "Apply every required review label. Keep the card here until all approvals are recorded.",
              exit: "DES, OPS, and ENG reviews are approved.",
              reviews: [
                { label: "DES review", owner: "Mate", color: "#bec2c8" },
                { label: "OPS review", owner: "Ops team", color: "#ff6eff" },
                { label: "ENG review", owner: "Engineering", color: "#43fc11" },
                { label: "Approved", owner: "All clear", color: "#4cb782" },
              ],
            },
            {
              board: "Engineering", status: "Todo", type: "Unstarted", color: "#e2e2e2", owner: "Design team lead",
              state: "Handoff cleared",
              action: "Move the approved card to the Engineering board without splitting its context.",
              exit: "Engineering accepts the card for implementation.",
            },
            {
              board: "Engineering", status: "QA 👀", type: "Started", color: "#f2c94c", owner: "Original designer",
              state: "Design QA",
              action: "Check the implemented behavior against the approved design and acceptance criteria.",
              exit: "The designer records approval in the original QA thread.",
            },
          ],
        },
      },
      {
        id: "card-ownership",
        title: "The assignee owns the quality of the card",
        body: "Whoever is working on the card must use the Feature template and complete every required field. The card should let the next person understand the outcome, behavior, decisions, and validation criteria without reconstructing the project history.",
        checklist: [
          "Start from the Feature template—do not create an unstructured delivery card.",
          "Fill every required field, including outcome, scope, design links, states, analytics, and acceptance criteria.",
          "Keep decisions and scope changes on the card as the work moves through review and implementation.",
          "Stay accountable after handoff: follow the card until it reaches Engineering QA.",
          "If you designed it, you QA the implemented experience and record your approval.",
        ],
      },
      {
        id: "qa-comments",
        title: "Keep QA findings in one comment thread",
        body: "QA should read as one continuous record. Open one top-level comment, capture findings as a checklist, and use replies on that original comment for every follow-up round.",
        qaProtocol: true,
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
  logoLoading = false,
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
              <DesignHubSwitcher active="design" c={c} logo={assets.eonLogo} logoLoading={logoLoading} onSelect={navigateProduct} />
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
              <span className="eon-accent-icon" style={{ background: c.active, color: c.brand }}><card.icon size={18} aria-hidden="true" /></span>
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
          {section.checklist.map((item) => <li key={item}><span className="eon-accent-icon" style={{ background: c.active, color: c.brand }}><Check size={14} /></span><p>{item}</p></li>)}
        </ul>
      )}
      {section.resources && (
        <div className="eon-design-resources">
          {section.resources.map((resource) => (
            <button key={resource.title} className="eon-buttonish" type="button" disabled={resource.pending} onClick={() => resource.to && navigateProduct(resource.to)} style={{ background: c.panel, boxShadow: "var(--shadow-surface)", color: c.text }}>
              <span className="eon-design-resource-icon eon-accent-icon" style={{ background: c.active, color: c.brand }}><BookOpen size={17} /></span>
              <span><strong>{resource.title}</strong><small style={{ color: c.secondary }}>{resource.body}</small></span>
              {resource.pending ? <em style={{ color: c.muted }}>Link needed</em> : <ExternalLink size={15} style={{ color: c.muted }} />}
            </button>
          ))}
        </div>
      )}
      {section.linearFlow && <LinearHandoffFlow flow={section.linearFlow} c={c} />}
      {section.qaProtocol && <QaCommentProtocol c={c} />}
    </section>
  );
}

function LinearHandoffFlow({ flow, c }) {
  return (
    <div className="eon-linear-flow" aria-label="Linear handoff board flow">
      <section className="eon-linear-example" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
        <header>
          <span className="eon-accent-icon" style={{ background: c.active, color: c.brand }}><ListChecks size={17} aria-hidden="true" /></span>
          <div>
            <small style={{ color: c.brand }}>Example ticket · {flow.ticket.template}</small>
            <h3>{flow.ticket.id} · {flow.ticket.title}</h3>
            <p style={{ color: c.secondary }}>The same complete ticket moves through every column below—context is never recreated at handoff.</p>
          </div>
        </header>
        <div className="eon-linear-example-body">
          <div className="eon-linear-example-meta">
            {flow.ticket.meta.map((item) => <span key={item} style={{ background: c.active, color: c.secondary }}>{item}</span>)}
          </div>
          <ul>
            {flow.ticket.context.map((item) => <li key={item}><Check className="eon-accent-icon" size={12} aria-hidden="true" style={{ color: c.brand }} />{item}</li>)}
          </ul>
        </div>
      </section>

      <div className="eon-linear-board-heading">
        <div>
          <GitBranch className="eon-accent-icon" size={16} aria-hidden="true" style={{ color: c.brand }} />
          <strong>Ticket path</strong>
          <span style={{ color: c.muted }}>{flow.source}</span>
        </div>
        <small style={{ color: c.muted }}>Scroll horizontally →</small>
      </div>

      <div className="eon-linear-board" role="list" tabIndex="0" aria-label="Linear workflow columns">
        {flow.columns.map((column, index) => (
          <article
            className="eon-linear-column"
            key={`${column.board}-${column.status}`}
            role="listitem"
            style={{ background: c.panel, boxShadow: "var(--shadow-surface)", "--linear-status": column.color }}
          >
            <header>
              <div>
                <span className="eon-linear-status-dot" aria-hidden="true" />
                <strong>{column.status}</strong>
                <em style={{ color: c.muted }}>{String(index + 1).padStart(2, "0")}</em>
              </div>
              <p><span style={{ color: c.muted }}>{column.board} board</span><b style={{ color: column.color }}>{column.type}</b></p>
            </header>

            <div className="eon-linear-column-owner" style={{ background: c.active }}>
              <span style={{ color: c.muted }}>Moved by</span>
              <strong>{column.owner}</strong>
            </div>

            <div className="eon-linear-ticket" style={{ background: c.raised }}>
              <div><span style={{ color: c.muted }}>{index < 5 ? flow.ticket.id : "ENG-###"}</span><b style={{ background: `${column.color}20`, color: column.color }}>{column.state}</b></div>
              <strong>{flow.ticket.title}</strong>
              <p style={{ color: c.secondary }}>{column.action}</p>
              {column.reviews && (
                <ul className="eon-linear-review-labels" aria-label="Required approval labels">
                  {column.reviews.map((review) => (
                    <li key={review.label} style={{ "--review-color": review.color }}>
                      <span aria-hidden="true" />
                      <div><strong>{review.label}</strong><small style={{ color: c.muted }}>{review.owner}</small></div>
                      {review.label === "Approved" ? <Check size={13} aria-hidden="true" /> : <ShieldCheck size={13} aria-hidden="true" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer>
              <span style={{ color: c.muted }}>Move on when</span>
              <p style={{ color: c.secondary }}>{column.exit}</p>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function QaCommentProtocol({ c }) {
  const findings = [
    "Check the implemented behavior against the approved design and acceptance criteria.",
    "List every finding as a checklist item under this one comment.",
    "Resolve or update each item as engineering addresses it.",
  ];
  return (
    <div className="eon-qa-protocol">
      <div className="eon-qa-thread" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
        <article className="eon-qa-comment" style={{ background: c.raised }}>
          <header>
            <span style={{ background: c.active, color: c.brand }}>You</span>
            <div><strong>Design QA findings</strong><small style={{ color: c.muted }}>Original comment · keep this thread open</small></div>
          </header>
          <ul>
            {findings.map((finding) => <li key={finding}><span className="eon-accent-icon" style={{ color: c.brand }}><Check size={12} /></span><p>{finding}</p></li>)}
          </ul>
          <div className="eon-qa-reply" style={{ background: c.active }}>
            <MessageSquareText className="eon-accent-icon" size={15} aria-hidden="true" style={{ color: c.brand }} />
            <div><strong>Round 2 reply</strong><p style={{ color: c.secondary }}>Add the next QA pass here as a reply—do not open another top-level comment.</p></div>
          </div>
        </article>
      </div>
      <ol className="eon-qa-rules">
        <li><span style={{ background: c.active, color: c.brand }}>1</span><div><strong>Open one comment</strong><p style={{ color: c.secondary }}>Use a single top-level comment for the complete QA record.</p></div></li>
        <li><span style={{ background: c.active, color: c.brand }}>2</span><div><strong>Use a checklist</strong><p style={{ color: c.secondary }}>Add every finding beneath that comment with checkmarks.</p></div></li>
        <li><span style={{ background: c.active, color: c.brand }}>3</span><div><strong>Reply for the next round</strong><p style={{ color: c.secondary }}>Continue under the original comment instead of creating duplicates.</p></div></li>
      </ol>
    </div>
  );
}
