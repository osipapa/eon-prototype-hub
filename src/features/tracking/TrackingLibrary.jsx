import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BarChart3, Check, ChevronRight, ClipboardCheck,
  Code2, Copy, FileText, Menu, X,
} from "lucide-react";
import DesignHubSwitcher from "@/components/DesignHubSwitcher";
import { HubChangelogDialog, useHubChangelog } from "@/components/HubChangelog";
import HubSidebarFooter from "@/components/HubSidebarFooter";
import SidebarResizeHandle, { useResizableSidebar } from "@/components/SidebarResizeHandle";
import { HUB } from "@/features/hub/prototypes";
import { useSystemTheme } from "@/lib/systemTheme";
import { copyText } from "@/lib/uiState";
import { MIXPANEL_TRACKING_EXAMPLE } from "./trackingExample";

export default function TrackingLibrary({
  assets = {},
  logoLoading = false,
  userEmail,
  isAdmin,
  onOpenDesign,
  onOpenPrototypes,
  onOpenPrompts,
  onOpenAdmin,
  onSignOut,
}) {
  const hubTheme = useSystemTheme();
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 900);
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const changelog = useHubChangelog();
  const sidebarResize = useResizableSidebar("eon-sidebar-width");
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
          logoLoading={logoLoading}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onOpenDesign={onOpenDesign}
          onOpenPrototypes={onOpenPrototypes}
          onOpenPrompts={onOpenPrompts}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
          changelog={changelog}
          resize={sidebarResize}
          isDrawer={narrow}
          onClose={() => setNavOpen(false)}
        />
      )}

      <main className="eon-tracking-main">
        <header className="eon-prompt-toolbar" style={{ background: c.nav, borderColor: c.border }}>
          {narrow && !navOpen && (
            <button
              className="eon-buttonish eon-icon-button"
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open tracking navigation"
              style={{ color: c.muted, boxShadow: hubShadow(c) }}
            >
              <Menu size={17} />
            </button>
          )}
          <div className="eon-prompt-breadcrumbs" aria-label="Current tracking reference">
            <span style={{ color: c.muted }}>Tracking</span>
            <ChevronRight size={13} aria-hidden="true" style={{ color: c.muted }} />
            <strong>{example.title}</strong>
          </div>
          <div className="eon-prompt-toolbar-spacer" />
        </header>

        <div className="eon-tracking-scroll">
          <div className="eon-tracking-layout">
            <article className="eon-tracking-article">
              <header className="eon-tracking-hero">
                <div className="eon-tracking-hero-kicker" style={{ color: c.brand }}>
                  <BarChart3 className="eon-accent-icon" size={15} aria-hidden="true" />
                  {example.platform} setup
                </div>
                <h1>{example.title}</h1>
                <p style={{ color: c.secondary }}>{example.summary}</p>
                <div className="eon-tracking-hero-stats" style={{ borderColor: c.border }}>
                  <span><strong>5</strong> setup steps</span>
                  <span><strong>1</strong> reusable prompt</span>
                  <span><strong>{example.coverage}</strong></span>
                </div>
              </header>

              <DocSection c={c} kicker="Setup" title="How tracking is implemented">
                <div className="eon-tracking-steps">
                  {example.setupSteps.map((step, index) => (
                    <div className="eon-tracking-step" key={step.title} style={{ background: c.panel, boxShadow: hubShadow(c) }}>
                      <span style={{ background: c.active, color: c.brand }}>{index + 1}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <p style={{ color: c.secondary }}>{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DocSection>

              <DocSection c={c} kicker="Example" title="Event contract">
                <EventContract c={c} event={example.eventExample} />
              </DocSection>

              <DocSection c={c} kicker="Implementation" title="Guardrails">
                <Checklist c={c} items={example.guardrails} Icon={Code2} tone="info" />
              </DocSection>

              <DocSection c={c} kicker="Validation" title="QA checklist">
                <Checklist c={c} items={example.qa} Icon={ClipboardCheck} tone="success" />
              </DocSection>
            </article>

            <aside className="eon-tracking-rail">
              <div className="eon-tracking-rail-card" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
                <div className="eon-prompt-use-head">
                  <span className="eon-tracking-rail-icon eon-accent-icon" style={{ background: c.active, color: c.brand }}><BarChart3 size={17} /></span>
                  <h2>Setup prompt</h2>
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
                <div className="eon-tracking-meta" style={{ borderColor: c.border }}>
                  <div><span>Platform</span><strong>Mixpanel</strong></div>
                  <div><span>Purpose</span><strong>Product analytics</strong></div>
                  <div><span>Coverage</span><strong>{example.coverage}</strong></div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <HubChangelogDialog c={c} open={changelog.isOpen} onClose={changelog.close} />
    </div>
  );
}

function TrackingSidebar({
  c, logo, logoLoading, userEmail, isAdmin, onOpenDesign, onOpenPrototypes, onOpenPrompts, onOpenAdmin, onSignOut, changelog, resize, isDrawer, onClose,
}) {
  return (
    <aside
      className="eon-prompt-sidebar"
      role={isDrawer ? "dialog" : "navigation"}
      aria-modal={isDrawer || undefined}
      aria-label="Tracking navigation"
      style={{
        background: c.nav,
        borderColor: c.border,
        ...(!isDrawer ? { width: resize.width, flexBasis: resize.width } : {}),
      }}
    >
      {!isDrawer && <SidebarResizeHandle resize={resize} label="Resize tracking navigation" />}
      <div className="eon-prompt-sidebar-head" style={{ borderColor: c.border }}>
        <div className="eon-brand-row">
          <DesignHubSwitcher
            active="tracking"
            c={c}
            logo={logo}
            logoLoading={logoLoading}
            onSelect={(product) => {
              if (product === "design") onOpenDesign?.();
              if (product === "prototypes") onOpenPrototypes?.();
              if (product === "prompts") onOpenPrompts?.();
            }}
          />
          {isDrawer && (
            <button className="eon-buttonish eon-icon-button" type="button" onClick={onClose} aria-label="Close tracking navigation" style={{ color: c.muted }}>
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="eon-tracking-sidebar-body">
        <div className="eon-prompt-nav-label" style={{ color: c.muted }}>Examples</div>
        <button
          className="eon-buttonish eon-tracking-nav-item"
          type="button"
          aria-current="page"
          style={{ background: c.active, color: c.text }}
        >
          <BarChart3 className="eon-accent-icon" size={15} aria-hidden="true" style={{ color: c.brand }} />
          <span>
            <strong>Mixpanel tracking setup</strong>
            <small style={{ color: c.muted }}>General setup guide</small>
          </span>
        </button>
      </div>

      <HubSidebarFooter
        c={c}
        userEmail={userEmail}
        isAdmin={isAdmin}
        onOpenAdmin={onOpenAdmin}
        onSignOut={onSignOut}
        changelog={changelog}
      />
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
          <code style={{ background: c.raised, color: c.text }}>{event.name}</code>
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

function Checklist({ c, items, Icon, tone }) {
  return (
    <div className="eon-tracking-checklist" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
      {items.map((item) => (
        <div key={item} style={{ borderColor: c.border }}>
          <span className={`is-${tone}`}><Icon size={14} aria-hidden="true" /></span>
          <p style={{ color: c.secondary }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

function hubShadow() {
  return "var(--shadow-surface)";
}
