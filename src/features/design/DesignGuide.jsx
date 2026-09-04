import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, Boxes, Check, ChevronDown, ChevronRight, ExternalLink,
  FileCheck2, FolderOpen, GitBranch, Lightbulb, ListChecks, Menu,
  MessageSquareText, Milestone, MousePointer2, ShieldCheck, Sparkles,
  Workflow, X, BarChart3,
} from "lucide-react";
import DesignHubSwitcher from "@/components/DesignHubSwitcher";
import { HubChangelogDialog, useHubChangelog } from "@/components/HubChangelog";
import HubSidebarFooter from "@/components/HubSidebarFooter";
import SidebarResizeHandle, { useResizableSidebar } from "@/components/SidebarResizeHandle";
import { HUB } from "@/features/hub/prototypes";
import { useSystemTheme } from "@/lib/systemTheme";
import TrackingBlock from "@/features/tracking/TrackingBlocks";

const PAGE_GROUPS = [
  {
    label: "Get started",
    pages: [
      { slug: "overview", title: "Overview", wip: true },
      { slug: "principles", title: "Design principles", wip: true },
    ],
  },
  {
    label: "How we work",
    pages: [
      { slug: "product-process", title: "Product design process", wip: true },
      { slug: "design-review", title: "Design review", wip: true },
      { slug: "ai-principles", title: "AI usage principles", wip: true },
    ],
  },
  {
    label: "Linear",
    pages: [
      { slug: "linear-handoff", title: "Handoff flow" },
      { slug: "linear-estimation", title: "Estimation" },
      { slug: "linear-cards", title: "Card quality & QA" },
    ],
  },
  {
    label: "Tracking",
    pages: [
      { slug: "tracking-mixpanel", title: "Mixpanel" },
      { slug: "tracking-websites", title: "Websites" },
    ],
  },
  {
    label: "Resources",
    pages: [
      { slug: "common-files", title: "Common files & tools", wip: true },
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
        body: "Eon Design keeps team standards, review rules, handoff steps, and common links in one place. Product, design, engineering, and operations can work from the same instructions.",
        cards: [
          { title: "Principles", body: "The qualities we want every Eon experience to express.", icon: Sparkles, to: "principles" },
          { title: "Ways of working", body: "A practical path from framing through learning.", icon: Workflow, to: "product-process" },
          { title: "Linear", body: "How we point, hand off, and QA work on the board.", icon: FileCheck2, to: "linear-handoff" },
          { title: "Tracking", body: "How we instrument Mixpanel and keep attribution intact on the websites.", icon: BarChart3, to: "tracking-mixpanel" },
          { title: "Resources", body: "Common destinations for files, tools, and shared references.", icon: FolderOpen, to: "common-files" },
        ],
      },
      {
        id: "path",
        title: "A shared path from idea to learning",
        body: "Use each step when it answers a real question or records a decision. Skip steps that add no useful information.",
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
        body: "Use these principles in briefs and critiques. If two principles point to different choices, name the tradeoff.",
        cards: [
          { title: "Make the next step clear", body: "Prioritize the decision or action in front of the customer. Reveal depth as it becomes useful.", icon: MousePointer2 },
          { title: "Earn confidence", body: "Show status, consequences, and recovery paths. Never make people guess whether important work was saved.", icon: Check },
          { title: "Design the whole journey", body: "Include empty, loading, error, permission, and return states. The ideal path is only one part of the work.", icon: Boxes },
          { title: "Prefer useful momentum", body: "Reduce handoffs and repeated work while keeping people in control of consequential actions.", icon: Milestone },
        ],
      },
      {
        id: "using-principles",
        title: "Use principles to resolve a tradeoff",
        body: "Name the tension and the principle that matters most. Record what the decision prioritizes. Principles guide judgment but do not replace it.",
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
    summary: "Five steps for turning an unclear opportunity into a shipped change the team can measure.",
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
        body: "Compare distinct approaches, then build the smallest realistic prototype that answers the riskiest question.",
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
          { title: "Direction review", body: "Use this early to align on the problem, options, and riskiest assumptions.", icon: Lightbulb },
          { title: "Interaction review", body: "Use this while shaping the work to inspect flows, system behavior, states, and content together.", icon: MousePointer2 },
          { title: "Delivery review", body: "Use this before handoff to check responsive behavior, accessibility, and edge cases.", icon: FileCheck2 },
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
    kicker: "Linear",
    title: "Handoff flow",
    summary: "The board flow and review gates that carry design work from an idea through Engineering QA.",
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
    ],
  },
  "linear-estimation": {
    kicker: "Linear",
    title: "Estimation",
    summary: "What a point means on our boards, so an estimate reads the same to everyone who opens the card.",
    sections: [
      {
        id: "point-scale",
        title: "What a point is worth",
        body: "Our board uses Linear's doubling scale. Each calendar below is four working weeks, Monday to Friday, with the estimate filled in from the first day. Points describe effort, not a delivery date: use them to place a card against the others. The accent fill marks 4, 8, and 16, the anchors the team agreed; 1 and 2 follow the same doubling, and the greyed calendars are sizes a card should be split before it reaches.",
        calendar: [
          { points: "1", days: 0.25, meaning: "A couple of hours", note: "A small, well understood change with nothing to investigate first." },
          { points: "2", days: 0.5, meaning: "Half a day", note: "Clear scope and a handful of states." },
          { points: "4", days: 1, anchor: true, meaning: "About a day", note: "One focused day with the shape already clear." },
          { points: "8", days: 2.5, anchor: true, meaning: "About half a week", note: "Several states, or a dependency to resolve." },
          { points: "16", days: 5, anchor: true, meaning: "About a week", note: "The largest a card should normally get." },
          { points: "32", days: 10, oversized: true, meaning: "About two weeks", note: "Too big to estimate honestly. Split it into cards that each ship something." },
          { points: "64", days: 20, oversized: true, meaning: "About a month", note: "A project, not a card. Break it down before it reaches the board." },
        ],
      },
      {
        id: "estimating-well",
        title: "How to land on a number",
        body: "Estimate the whole card, including the states, the edge cases, and the review rounds the work will actually need.",
        checklist: [
          "Size the work as written on the card. If the scope is not clear enough to size, the card is not ready to estimate.",
          "Include the states, the empty and error paths, and the review rounds, not just the ideal screen.",
          "For anything under a day, use the small end of the scale. Pick by how much is unknown, not by counting hours.",
          "If a card would go past 16, split it into cards that each deliver something on their own.",
          "Re-point when scope changes, and say on the card why the number moved.",
        ],
      },
    ],
  },
  "linear-cards": {
    kicker: "Linear",
    title: "Card quality & QA",
    summary: "What a card has to contain to be useful to the next person, and how QA findings stay readable.",
    sections: [
      {
        id: "card-ownership",
        title: "The assignee owns the quality of the card",
        body: "Whoever is working on the card must use the Feature template and complete every required field. The card should let the next person understand the outcome, behavior, decisions, and validation criteria without reconstructing the project history.",
        checklist: [
          "Start from the Feature template. Do not create an unstructured delivery card.",
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
  "tracking-mixpanel": {
    kicker: "Tracking",
    title: "Mixpanel tracking setup",
    summary: "How we turn something a person does in the product into an event we can trust in a report, shown on the trip review flow.",
    sections: [
      { id: "overview", title: "What we track, and in what order", tracking: "mixpanel-overview" },
      { id: "tap", title: "From a tap to an event", tracking: "mixpanel-tap" },
      { id: "format", title: "How we name and format things", tracking: "mixpanel-format" },
      { id: "plan", title: "The trip review flow, event by event", body: "Three events and one that already exists. For each: when it fires, the payload as sent, and every property with its type and allowed values.", tracking: "mixpanel-plan" },
      { id: "rules", title: "Rules we keep to", tracking: "mixpanel-rules" },
      { id: "prompt", title: "Setup prompt", tracking: "mixpanel-prompt" },
    ],
  },
  "tracking-websites": {
    kicker: "Tracking",
    title: "Site-wide attribution & routing",
    summary: "How a person who taps an ad ends up in the app, the web app, or the store with the campaign and promo code still attached.",
    sections: [
      { id: "overview", title: "What the script does", tracking: "attr-overview" },
      { id: "system-map", title: "Where a click goes", body: "The site builds the link. AppsFlyer OneLink records the click and decides where the person ends up, based on their device and whether the app is installed.", tracking: "attr-map" },
      { id: "campaign-link", title: "What a campaign link looks like", tracking: "attr-url" },
      { id: "memory", title: "What the script remembers", tracking: "attr-memory" },
      { id: "buttons", title: "How a button gets its link", tracking: "attr-buttons" },
      { id: "deep-link", title: "Opening the right screen in the app", tracking: "attr-deeplink" },
      { id: "across-pages", title: "Keeping the details from page to page", tracking: "attr-across" },
      { id: "coming-back", title: "Coming back from AppsFlyer", tracking: "attr-return" },
      { id: "devices", title: "What happens on each device", tracking: "attr-devices" },
      { id: "examples", title: "Worked examples", body: "The same person, six visits. What the Subscribe button on the page carries after each one.", tracking: "attr-examples" },
      { id: "settings", title: "Settings the script depends on", body: "The values at the top of the script, and what has to be true in AppsFlyer and in the apps for the whole chain to work.", tracking: "attr-settings" },
      { id: "console", title: "Checking it in the browser", tracking: "attr-console" },
    ],
  },
  "ai-principles": {
    kicker: "How we work",
    title: "AI usage principles",
    summary: "How the team uses AI tools in design work, and what we check before anything AI-assisted ships.",
    sections: [
      {
        id: "scope",
        title: "What this page will cover",
        body: "Where AI tools help and where they get in the way, what we review before AI-assisted work goes out, what never goes into a prompt, and how we say when AI was used. The principles are being written with the team; nothing here is final yet.",
      },
    ],
  },
  "common-files": {
    kicker: "Resources",
    title: "Common files & tools",
    summary: "Links to the files and tools the team uses most.",
    sections: [
      {
        id: "live-tools",
        title: "Eon Design tools",
        resources: [
          { title: "Prototype hub", body: "Build, review, comment on, and share interactive product work.", to: "prototypes" },
          { title: "Prompt library", body: "Reusable prompts and templates for design and delivery work.", to: "prompts" },
          { title: "Tracking guides", body: "Mixpanel setup, and how attribution flows through the websites.", page: "tracking-mixpanel" },
        ],
      },
      {
        id: "shared-destinations",
        title: "Shared destinations to connect",
        body: "Replace each placeholder when the team agrees on the destination URL.",
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
                {pageRecord.wip && <p className="eon-design-wip" style={{ color: c.muted, borderColor: c.border }}>This page is in progress. The team is still writing it, so there is nothing to read here yet.</p>}
              </header>
              {!pageRecord.wip && page.sections.map((section) => (
                <DesignSection key={section.id} section={section} c={c} onSelectPage={selectPage} navigateProduct={navigateProduct} onOpenPrompts={onOpenPrompts} />
              ))}
            </article>
            {!pageRecord.wip && (
              <aside className="eon-design-toc" aria-label="On this page">
                <div style={{ borderColor: c.border }}>
                  <strong>On this page</strong>
                  {page.sections.map((section) => <a key={section.id} href={`#${section.id}`} style={{ color: c.muted }}>{section.title}</a>)}
                </div>
              </aside>
            )}
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
            {page.wip && <small style={{ color: c.muted }}>In progress</small>}
          </button>
        );
      })}
    </section>
  );
}

function DesignSection({ section, c, onSelectPage, navigateProduct, onOpenPrompts }) {
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
            <button key={resource.title} className="eon-buttonish" type="button" disabled={resource.pending} onClick={() => (resource.page ? onSelectPage(ALL_PAGES.find((page) => page.slug === resource.page)) : resource.to && navigateProduct(resource.to))} style={{ background: c.panel, boxShadow: "var(--shadow-surface)", color: c.text }}>
              <span className="eon-design-resource-icon eon-accent-icon" style={{ background: c.active, color: c.brand }}><BookOpen size={17} /></span>
              <span><strong>{resource.title}</strong><small style={{ color: c.secondary }}>{resource.body}</small></span>
              {resource.pending ? <em style={{ color: c.muted }}>Link needed</em> : <ExternalLink size={15} style={{ color: c.muted }} />}
            </button>
          ))}
        </div>
      )}
      {section.calendar && (
        <div className="eon-design-calendar">
          {section.calendar.map((step) => {
            const fill = step.oversized ? c.muted : step.anchor ? c.brand : c.secondary;
            return (
              <figure key={step.points} className={`eon-cal-card${step.oversized ? " is-oversized" : ""}`} style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
                <div className="eon-cal-head">
                  <strong style={{ color: c.text }}>{step.points}</strong>
                  <span style={{ color: c.secondary }}>{step.meaning}</span>
                </div>
                <div className="eon-cal-grid" role="img" aria-label={`${step.points} points fills ${step.days} of twenty working days`}>
                  {["M", "T", "W", "T", "F"].map((day, index) => (
                    <span key={`day-${index}`} className="eon-cal-day" style={{ color: c.muted }}>{day}</span>
                  ))}
                  {Array.from({ length: 20 }, (_, index) => {
                    const filled = Math.max(0, Math.min(1, step.days - index));
                    return (
                      <span key={index} className="eon-cal-cell" style={{ background: c.raised }}>
                        {filled > 0 && <i style={{ width: `${filled * 100}%`, background: fill }} />}
                      </span>
                    );
                  })}
                </div>
                <figcaption style={{ color: c.muted }}>{step.note}</figcaption>
              </figure>
            );
          })}
        </div>
      )}
      {section.linearFlow && <LinearHandoffFlow flow={section.linearFlow} c={c} />}
      {section.qaProtocol && <QaCommentProtocol c={c} />}
      {section.tracking && <TrackingBlock block={section.tracking} c={c} onOpenPrompts={onOpenPrompts} />}
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
            <p style={{ color: c.secondary }}>The complete ticket moves through every column below. Keep its context in one place.</p>
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
            <div><strong>Round 2 reply</strong><p style={{ color: c.secondary }}>Add the next QA pass as a reply here. Do not open another top-level comment.</p></div>
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
