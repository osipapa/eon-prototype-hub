import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Plug, X } from "lucide-react";
import { copyText } from "@/lib/uiState";
import { CLAUDE_CODE_COMMAND, CONNECTOR_URL, fetchSignInStatus } from "@/lib/claudeConnect";

const PLATFORMS = [
  { key: "app", label: "Claude app" },
  { key: "code", label: "Claude Code" },
];

function CopyField({ c, label, value }) {
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef(null);
  const copy = async () => {
    try {
      await copyText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: the text stays selectable */ }
    // The copy fallback selects a hidden field; keep focus in the dialog.
    buttonRef.current?.focus();
  };
  return (
    <div className="eon-connect-field" style={{ background: c.raised, borderColor: c.border }}>
      <code style={{ color: c.text }}>{value}</code>
      <button ref={buttonRef} className="eon-buttonish eon-icon-button" type="button" onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`} title={copied ? "Copied" : "Copy"}
        style={{ color: copied ? c.brand : c.muted }}>
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

/* ---- Step illustrations: small drawn stand-ins for each screen, not
   screenshots, so they stay true when Claude's own UI shifts. ---- */
function SettingsArt({ c }) {
  return (
    <div className="eon-art-window">
      <div className="eon-art-side">
        {["General", "Connectors", "Account"].map((item) => (
          <span key={item} style={item === "Connectors" ? { background: c.active, color: c.brand } : { color: c.muted }}>{item}</span>
        ))}
      </div>
      <div className="eon-art-main">
        <span className="eon-art-line" style={{ background: c.border }} />
        <span className="eon-art-line is-short" style={{ background: c.border }} />
        <span className="eon-art-pill" style={{ borderColor: c.brand, color: c.brand }}>+ Add custom connector</span>
      </div>
    </div>
  );
}

function FormArt({ c }) {
  return (
    <div className="eon-art-form">
      <span style={{ color: c.muted }}>Name</span>
      <span className="eon-art-input" style={{ borderColor: c.border, color: c.text }}>Eon Hub</span>
      <span style={{ color: c.muted }}>URL</span>
      <span className="eon-art-input" style={{ borderColor: c.brand, color: c.text }}>…/functions/v1/hub-mcp</span>
      <span className="eon-art-button" style={{ background: c.text, color: c.nav }}>Add</span>
    </div>
  );
}

function ConsentArt({ c }) {
  return (
    <div className="eon-art-consent">
      <strong style={{ color: c.text }}>Connect Claude?</strong>
      <span className="eon-art-line" style={{ background: c.border }} />
      <span className="eon-art-button is-wide" style={{ background: c.text, color: c.nav }}>Allow</span>
      <span className="eon-art-button is-wide is-ghost" style={{ borderColor: c.border, color: c.muted }}>Deny</span>
    </div>
  );
}

function ChatArt({ c }) {
  return (
    <div className="eon-art-chat">
      <span className="eon-art-bubble is-me" style={{ background: c.active, color: c.text }}>Use Eon Hub to list prototypes</span>
      <span className="eon-art-bubble" style={{ background: c.panel, color: c.secondary }}>Here are your prototypes…</span>
    </div>
  );
}

function TerminalArt({ c, lines }) {
  return (
    <div className="eon-art-terminal">
      {lines.map(([text, highlight], index) => (
        <span key={index} style={{ color: highlight ? c.brand : "#b9b9b9" }}>{text}</span>
      ))}
    </div>
  );
}

const STEPS = {
  app: [
    { title: "Open Settings → Connectors", art: SettingsArt, body: () => <p>In the Claude app or on claude.ai, then choose Add custom connector.</p> },
    {
      title: "Paste the Eon Hub URL",
      art: FormArt,
      body: (c) => (
        <>
          <p>Name it Eon Hub and paste this URL:</p>
          <CopyField c={c} label="connector URL" value={CONNECTOR_URL} />
        </>
      ),
    },
    { title: "Connect, then Allow", art: ConsentArt, body: () => <p>The hub opens. Sign in if it asks, then Allow.</p> },
    { title: "Ask Claude", art: ChatArt, body: () => <p>Try “Use Eon Hub to list prototypes”, then ask for an edit.</p> },
  ],
  code: [
    {
      title: "Add the server",
      art: (props) => <TerminalArt {...props} lines={[["$ claude mcp add --transport http", false], ["  eon-hub …/hub-mcp", true], ["Added eon-hub", false]]} />,
      body: (c) => (
        <>
          <p>Run this once in your terminal:</p>
          <CopyField c={c} label="command" value={CLAUDE_CODE_COMMAND} />
        </>
      ),
    },
    {
      title: "Sign in with /mcp",
      art: (props) => <TerminalArt {...props} lines={[["> /mcp", false], ["  eon-hub · needs sign-in", false], ["  ❯ Authenticate", true]]} />,
      body: () => <p>Start claude, run /mcp, pick eon-hub, and choose Authenticate.</p>,
    },
    { title: "Allow in the browser", art: ConsentArt, body: () => <p>The hub opens. Sign in if it asks, then Allow.</p> },
    {
      title: "Ask Claude",
      art: (props) => <TerminalArt {...props} lines={[["> use eon-hub to list", false], ["  prototypes", false], ["● eon-hub · list_prototypes", true]]} />,
      body: () => <p>Try “use eon-hub to list prototypes”, then ask for an edit.</p>,
    },
  ],
};

function SignInStatus({ c, status, isAdmin }) {
  if (status === "ready") {
    return (
      <p className="eon-connect-status" style={{ color: c.secondary }}>
        <span className="eon-connect-dot" style={{ background: "#4CB782" }} aria-hidden="true" />
        Claude sign-in is on.
      </p>
    );
  }
  if (status !== "off") return null;
  return (
    <div className="eon-connect-status is-off" role="status" style={{ background: c.raised, borderColor: c.border, color: c.secondary }}>
      <span className="eon-connect-dot" style={{ background: "#F2C94C" }} aria-hidden="true" />
      <p>
        <strong style={{ color: c.text }}>Claude sign-in isn’t on yet.</strong>{" "}
        {isAdmin
          ? "In Supabase, open Authentication → OAuth Server, turn it on, set the authorization path to /oauth/consent/, and allow dynamic client registration."
          : "Ask a hub admin to turn it on, then come back here."}
      </p>
    </div>
  );
}

function ConnectClaudeDialog({ c, isAdmin, initialPlatform, onClose }) {
  const dialogRef = useRef(null);
  const [platform, setPlatform] = useState(initialPlatform);
  const [status, setStatus] = useState("unknown");
  // Held in a ref so a parent re-render (realtime, presence) can't re-run the
  // mount effect and yank focus back to Close.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const returnFocusTo = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    const onKey = (event) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      returnFocusTo?.focus?.();
    };
  }, []);

  useEffect(() => {
    let stale = false;
    const forced = import.meta.env.DEV && new URLSearchParams(window.location.search).get("connect-status");
    if (forced) setStatus(forced);
    else fetchSignInStatus().then((value) => { if (!stale) setStatus(value); });
    return () => { stale = true; };
  }, []);

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="eon-connect-title"
        className="eon-modal eon-connect-dialog" style={{ background: c.nav, borderColor: c.border }}>
        <div className="eon-modal-head" style={{ borderColor: c.border }}>
          <span className="eon-changelog-mark eon-accent-icon" style={{ background: c.active, color: c.brand }}>
            <Plug size={15} />
          </span>
          <div className="eon-changelog-heading">
            <strong id="eon-connect-title" style={{ color: c.text }}>Connect Claude</strong>
            <span style={{ color: c.muted }}>Edit prototypes from your own Claude, as you.</span>
          </div>
          <button className="eon-buttonish eon-icon-button eon-changelog-close" type="button" onClick={onClose}
            aria-label="Close" style={{ background: c.raised, color: c.muted, boxShadow: "var(--shadow-surface)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="eon-modal-body eon-connect-body" style={{ color: c.secondary }}>
          <SignInStatus c={c} status={status} isAdmin={isAdmin} />
          <div className="eon-connect-tabs" role="tablist" aria-label="Where you use Claude" style={{ background: c.raised }}>
            {PLATFORMS.map((item) => (
              <button key={item.key} type="button" role="tab" id={`eon-connect-tab-${item.key}`}
                aria-selected={platform === item.key} aria-controls="eon-connect-steps"
                className="eon-buttonish" onClick={() => setPlatform(item.key)}
                style={platform === item.key
                  ? { background: c.nav, color: c.text, boxShadow: "var(--shadow-surface)" }
                  : { color: c.muted }}>
                {item.label}
              </button>
            ))}
          </div>
          <ol id="eon-connect-steps" className="eon-connect-steps" role="tabpanel" aria-labelledby={`eon-connect-tab-${platform}`}>
            {STEPS[platform].map((step, index) => {
              const Art = step.art;
              return (
                <li key={step.title} className="eon-connect-step">
                  <div className="eon-connect-art" style={{ background: c.raised, borderColor: c.border }} aria-hidden="true">
                    <Art c={c} />
                  </div>
                  <div className="eon-connect-copy">
                    <strong style={{ color: c.text }}>
                      <span className="eon-connect-num" style={{ background: c.active, color: c.brand }}>{index + 1}</span>
                      {step.title}
                    </strong>
                    {step.body(c)}
                  </div>
                </li>
              );
            })}
          </ol>
          <p style={{ color: c.muted }}>
            Claude can list, read, search, and edit prototype HTML. Everyone sees its edits live, and it can restore any of the last 30 saved revisions.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ConnectClaudeButton({ c, isAdmin = false }) {
  // Dev preview: ?connect-claude[=code] opens the dialog, for screenshots.
  const previewParam = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("connect-claude") : null;
  const [open, setOpen] = useState(previewParam !== null);
  return (
    <>
      <button className="eon-buttonish eon-icon-button" type="button" onClick={() => setOpen(true)}
        aria-label="Connect Claude" title="Connect Claude"
        style={{ color: c.muted, boxShadow: "var(--shadow-surface)" }}>
        <Plug size={15} />
      </button>
      {/* Portaled: the footer can sit inside the phone nav drawer, whose
          transform would otherwise trap the fixed overlay at drawer width. */}
      {open && createPortal(
        <ConnectClaudeDialog c={c} isAdmin={isAdmin} initialPlatform={previewParam === "code" ? "code" : "app"}
          onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  );
}
