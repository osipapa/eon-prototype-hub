import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BarChart3, Check, CheckCircle2, ChevronRight, ClipboardCheck,
  Code2, Copy, ExternalLink, FileText, Info, LogOut, Menu, Moon, PanelLeftClose,
  Shield, Sun, X,
} from "lucide-react";
import DesignHubSwitcher from "@/components/DesignHubSwitcher";
import EonMark from "@/components/EonMark";
import { HUB } from "@/features/hub/prototypes";
import { copyText, useStoredState } from "@/lib/uiState";
import { MIXPANEL_TRACKING_EXAMPLE } from "./trackingExample";

export default function TrackingLibrary({
  assets = {},
  userEmail,
  isAdmin,
  onOpenPrototypes,
  onOpenPrompts,
  onOpenAdmin,
  onSignOut,
}) {
  const [hubTheme, setHubTheme] = useStoredState("eon-hub-theme", "dark");
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 900);
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const copiedTimer = useRef(null);
  const c = HUB[hubTheme];
  const example = MIXPANEL_TRACKING_EXAMPLE;

  useEffect(() => {
    const update = () => {
      const nextNarrow = window.innerWidth <= 900;
      setNarrow(nextNarrow);
      if (!nextNarrow) setNavOpen(true);
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const handleCopy = async (kind, value) => {
    setCopyError("");
    try {
      await copyText(value);
      setCopied(kind);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopyError("Clipboard access was blocked. Open the Prompt Library to select and copy the template.");
    }
  };

  return (
    <div className={`${hubTheme === "dark" ? "" : "light"} eon-tracking-workspace`} style={{ background: c.bg, color: c.text }}>
      {narrow && navOpen && (
        <button className="eon-drawer-scrim" type="button" aria-label="Close tracking navigation" onClick={() => setNavOpen(false)} />
      )}

      {navOpen && (
        <TrackingSidebar
          c={c}
          logo={assets.eonLogo}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onOpenPrototypes={onOpenPrototypes}
          onOpenPrompts={onOpenPrompts}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
          isDrawer={narrow}
          onClose={() => setNavOpen(false)}
        />
      )}

      <main className="eon-tracking-main">
        <header className="eon-prompt-toolbar" style={{ background: c.nav, borderColor: c.border }}>
          <button
            className="eon-buttonish eon-icon-button"
            type="button"
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? "Collapse tracking navigation" : "Open tracking navigation"}
            aria-pressed={navOpen}
            style={{ color: c.muted, boxShadow: hubShadow(c) }}
          >
            {navOpen ? <PanelLeftClose size={16} /> : <Menu size={17} />}
          </button>
          <div className="eon-prompt-breadcrumbs" aria-label="Current tracking reference">
            <span style={{ color: c.muted }}>Tracking</span>
            <ChevronRight size={13} aria-hidden="true" style={{ color: c.muted }} />
            <strong>{example.title}</strong>
          </div>
          <div className="eon-prompt-toolbar-spacer" />
          <button
            className="eon-buttonish eon-icon-button"
            type="button"
            onClick={() => setHubTheme(hubTheme === "dark" ? "light" : "dark")}
            aria-label={`Switch hub interface to ${hubTheme === "dark" ? "light" : "dark"} theme`}
            title="Hub interface theme"
            style={{ color: c.muted, boxShadow: hubShadow(c) }}
          >
            {hubTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <div className="eon-tracking-scroll">
          <div className="eon-tracking-layout">
            <article className="eon-tracking-article">
              <header className="eon-prompt-hero">
                <div className="eon-prompt-eyebrow" style={{ color: c.muted }}>
                  <span style={{ background: c.active, color: c.brand }}>{example.platform}</span>
                  <span className="eon-prompt-status"><CheckCircle2 size={13} aria-hidden="true" /> One reference</span>
                </div>
                <h1>{example.title}</h1>
                <p style={{ color: c.secondary }}>{example.summary}</p>
                <div className="eon-prompt-tags">
                  <span style={{ background: c.raised, color: c.secondary }}>8 event contracts</span>
                  <span style={{ background: c.raised, color: c.secondary }}>Web + iOS</span>
                  <span style={{ background: c.raised, color: c.secondary }}>Linear-sourced</span>
                </div>
              </header>

              <DocSection c={c} kicker="Source of truth" title="Implementation status">
                <div className="eon-tracking-source-grid">
                  {example.sources.map((source) => (
                    <a
                      className={`eon-tracking-source eon-tracking-source-${source.tone}`}
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ background: c.panel, color: c.text, boxShadow: hubShadow(c) }}
                    >
                      <div>
                        <span>{source.id}</span>
                        <em>{source.status}</em>
                        <ExternalLink size={14} aria-hidden="true" style={{ color: c.muted }} />
                      </div>
                      <strong>{source.title}</strong>
                      <p style={{ color: c.secondary }}>{source.note}</p>
                    </a>
                  ))}
                </div>
              </DocSection>

              <DocSection c={c} kicker="Reference" title="Event catalog">
                <div className="eon-tracking-flow-stack">
                  {example.flows.map((flow) => (
                    <section className="eon-tracking-flow" key={flow.id} aria-labelledby={`flow-${flow.id}`}>
                      <div className="eon-tracking-flow-head">
                        <div>
                          <span style={{ color: c.brand }}>{flow.source} · {flow.status}</span>
                          <h3 id={`flow-${flow.id}`}>{flow.title}</h3>
                        </div>
                        <span style={{ background: c.raised, color: c.muted }}>{flow.events.length} events</span>
                      </div>
                      <div className="eon-tracking-event-stack">
                        {flow.events.map((event) => (
                          <EventContract c={c} key={`${flow.id}-${event.name}`} event={event} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </DocSection>

              <DocSection c={c} kicker="Implementation" title="Guardrails">
                <Checklist c={c} items={example.guardrails} Icon={Code2} />
              </DocSection>

              <DocSection c={c} kicker="Before release" title="Open decisions">
                <div className="eon-tracking-decision-stack">
                  {example.openDecisions.map((decision) => (
                    <div className="eon-tracking-decision" key={decision.title} style={{ background: c.panel, boxShadow: hubShadow(c) }}>
                      <AlertTriangle size={16} aria-hidden="true" />
                      <div>
                        <strong>{decision.title}</strong>
                        <p style={{ color: c.secondary }}>{decision.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DocSection>

              <DocSection c={c} kicker="Validation" title="QA checklist">
                <Checklist c={c} items={example.qa} Icon={ClipboardCheck} />
              </DocSection>
            </article>

            <aside className="eon-tracking-rail">
              <div className="eon-tracking-rail-card" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
                <div className="eon-prompt-use-head">
                  <span className="eon-prompt-use-icon" style={{ background: c.active, color: c.brand }}><BarChart3 size={17} /></span>
                  <div>
                    <h2>Use this setup</h2>
                    <p style={{ color: c.muted }}>Copy the reusable prompt, then paste the relevant issue text and technical context.</p>
                  </div>
                </div>
                <button
                  className="eon-buttonish eon-prompt-copy-primary"
                  type="button"
                  onClick={() => handleCopy("prompt", example.setupPrompt)}
                  style={{ background: c.primary, color: c.primaryText }}
                >
                  {copied === "prompt" ? <Check size={15} /> : <Copy size={15} />}
                  {copied === "prompt" ? "Prompt copied" : "Copy setup prompt"}
                </button>
                <button
                  className="eon-buttonish eon-prompt-copy-secondary"
                  type="button"
                  onClick={onOpenPrompts}
                  style={{ borderColor: c.border, color: c.secondary }}
                >
                  <FileText size={15} />
                  Open in Prompt Library
                </button>
                {copyError && <p className="eon-prompt-copy-error" role="alert">{copyError}</p>}
                <div className="eon-tracking-rail-note" style={{ borderColor: c.border, color: c.muted }}>
                  <Info size={14} aria-hidden="true" />
                  <span>ENG-723 is the shipped reference. ENG-841 must stay marked draft until its open decisions are closed.</span>
                </div>
                <div className="eon-prompt-meta" style={{ borderColor: c.border }}>
                  <div><span>Platform</span><strong>Mixpanel</strong></div>
                  <div><span>Primary events</span><strong>6</strong></div>
                  <div><span>Page events</span><strong>2</strong></div>
                  <div><span>Sources</span><strong>ENG-723, ENG-841</strong></div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function TrackingSidebar({
  c, logo, userEmail, isAdmin, onOpenPrototypes, onOpenPrompts, onOpenAdmin, onSignOut, isDrawer, onClose,
}) {
  return (
    <aside
      className="eon-prompt-sidebar"
      role={isDrawer ? "dialog" : "navigation"}
      aria-modal={isDrawer || undefined}
      aria-label="Tracking navigation"
      style={{ background: c.nav, borderColor: c.border }}
    >
      <div className="eon-prompt-sidebar-head" style={{ borderColor: c.border }}>
        <div className="eon-brand-row">
          <div className="eon-brand" style={{ color: c.text }}>
            <EonMark src={logo} />
            <span>Eon Design Hub</span>
          </div>
          {isDrawer && (
            <button className="eon-buttonish eon-icon-button" type="button" onClick={onClose} aria-label="Close tracking navigation" style={{ color: c.muted }}>
              <X size={17} />
            </button>
          )}
        </div>
        <DesignHubSwitcher
          active="tracking"
          c={c}
          onSelect={(product) => {
            if (product === "prototypes") onOpenPrototypes?.();
            if (product === "prompts") onOpenPrompts?.();
          }}
        />
      </div>

      <div className="eon-tracking-sidebar-body">
        <div className="eon-prompt-nav-label" style={{ color: c.muted }}>Examples</div>
        <button
          className="eon-buttonish eon-tracking-nav-item"
          type="button"
          aria-current="page"
          style={{ background: c.active, color: c.text }}
        >
          <BarChart3 size={15} aria-hidden="true" style={{ color: c.brand }} />
          <span>
            <strong>Mixpanel tracking setup</strong>
            <small style={{ color: c.muted }}>ENG-723 · ENG-841</small>
          </span>
        </button>
        <div className="eon-tracking-sidebar-empty" style={{ borderColor: c.border, color: c.muted }}>
          <Info size={15} aria-hidden="true" />
          <span>This first version intentionally contains one end-to-end example.</span>
        </div>
      </div>

      <div className="eon-sidebar-foot" style={{ borderColor: c.border }}>
        <span title={userEmail || ""} style={{ color: c.muted }}>{userEmail || "Team member"}</span>
        {isAdmin && (
          <button className="eon-buttonish eon-icon-button" type="button" onClick={onOpenAdmin} aria-label="Admin dashboard" title="Admin dashboard" style={{ color: c.muted, boxShadow: hubShadow(c) }}>
            <Shield size={15} />
          </button>
        )}
        <button className="eon-buttonish eon-icon-button" type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" style={{ color: c.muted, boxShadow: hubShadow(c) }}>
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}

function DocSection({ c, kicker, title, children }) {
  return (
    <section className="eon-prompt-doc-section">
      <div className="eon-prompt-section-head">
        <div>
          <span className="eon-prompt-section-kicker" style={{ color: c.brand }}>{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function EventContract({ c, event }) {
  return (
    <div className="eon-tracking-event" style={{ borderColor: c.border, background: c.panel }}>
      <div className="eon-tracking-event-head" style={{ borderColor: c.border }}>
        <div>
          <code style={{ background: c.active, color: c.brand }}>{event.name}</code>
          <p style={{ color: c.secondary }}>{event.trigger}</p>
          {event.note && <small style={{ color: c.muted }}>{event.note}</small>}
        </div>
      </div>
      <div className="eon-tracking-table-wrap">
        <table className="eon-tracking-table">
          <thead style={{ color: c.muted }}>
            <tr>
              <th>Property</th>
              <th>Type</th>
              <th>Contract</th>
            </tr>
          </thead>
          <tbody>
            {event.properties.map((property) => (
              <tr key={property.name} style={{ borderColor: c.border }}>
                <td><code>{property.name}</code>{property.required && <span title="Required">Required</span>}</td>
                <td style={{ color: c.secondary }}>{property.type}</td>
                <td style={{ color: c.secondary }}>
                  {property.values}
                  {property.risk && <em><AlertTriangle size={12} aria-hidden="true" />{property.risk}</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Checklist({ c, items, Icon }) {
  return (
    <div className="eon-tracking-checklist" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
      {items.map((item) => (
        <div key={item} style={{ borderColor: c.border }}>
          <span style={{ background: c.active, color: c.brand }}><Icon size={14} aria-hidden="true" /></span>
          <p style={{ color: c.secondary }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

function hubShadow(c) {
  return c.bg === "#000000" ? "var(--shadow-surface)" : "var(--shadow-surface)";
}
