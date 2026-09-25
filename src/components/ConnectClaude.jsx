import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Plug, X } from "lucide-react";
import { copyText } from "@/lib/uiState";

const CONNECTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hub-mcp`;
const CLAUDE_CODE_COMMAND = `claude mcp add --transport http eon-hub ${CONNECTOR_URL}`;

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

function ConnectClaudeDialog({ c, onClose }) {
  const dialogRef = useRef(null);
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
          <section>
            <h3 style={{ color: c.text }}>Claude app or claude.ai</h3>
            <ol>
              <li>Settings → Connectors → Add custom connector.</li>
              <li>Name it Eon Hub and paste this URL:</li>
            </ol>
            <CopyField c={c} label="connector URL" value={CONNECTOR_URL} />
            <ol start={3}>
              <li>Connect, sign in with your hub account, and Allow.</li>
            </ol>
          </section>
          <section>
            <h3 style={{ color: c.text }}>Claude Code</h3>
            <CopyField c={c} label="command" value={CLAUDE_CODE_COMMAND} />
            <p>Then run /mcp, pick eon-hub, and sign in.</p>
          </section>
          <p style={{ color: c.muted }}>
            Claude can list, read, search, and edit prototype HTML. Everyone sees its edits live, and it can restore any of the last 30 versions.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ConnectClaudeButton({ c }) {
  // Dev preview: ?connect-claude opens the dialog, for changelog screenshots.
  const [open, setOpen] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).has("connect-claude"));
  return (
    <>
      <button className="eon-buttonish eon-icon-button" type="button" onClick={() => setOpen(true)}
        aria-label="Connect Claude" title="Connect Claude"
        style={{ color: c.muted, boxShadow: "var(--shadow-surface)" }}>
        <Plug size={15} />
      </button>
      {/* Portaled: the footer can sit inside the phone nav drawer, whose
          transform would otherwise trap the fixed overlay at drawer width. */}
      {open && createPortal(<ConnectClaudeDialog c={c} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
