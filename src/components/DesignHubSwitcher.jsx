import { useEffect, useRef, useState } from "react";
import {
  BarChart3, BookOpen, Check, ChevronDown, Monitor, Shapes,
} from "lucide-react";
import EonMark from "@/components/EonMark";

const PRODUCTS = [
  { id: "design", label: "Eon Design", description: "How Eon designs and ships", Icon: Shapes },
  { id: "prototypes", label: "Prototypes", description: "Build and review experiences", Icon: Monitor },
  { id: "prompts", label: "Prompts", description: "Reusable team prompts", Icon: BookOpen },
  { id: "tracking", label: "Mixpanel", description: "Instrument and validate", Icon: BarChart3 },
];

export default function DesignHubSwitcher({ active, c, logo, onSelect }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.type === "mousedown" && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("mousedown", close);
    };
  }, [open]);

  return (
    <div className="eon-design-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        className="eon-buttonish eon-design-switcher-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Switch Eon Design area"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ color: c.text, background: open ? c.raised : "transparent" }}
      >
        <span className="eon-design-switcher-logo" aria-hidden="true"><EonMark src={logo} /></span>
        <span className="eon-design-switcher-label">Eon Design</span>
        <ChevronDown className={open ? "is-open" : ""} size={15} aria-hidden="true" style={{ color: c.muted }} />
      </button>

      {open && (
        <div className="eon-design-switcher-menu" role="menu" aria-label="Eon Design areas" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
          {PRODUCTS.map(({ id, label, description, Icon }) => {
            const selected = active === id;
            return (
              <button
                className="eon-buttonish"
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setOpen(false);
                  if (!selected) onSelect?.(id);
                }}
                style={{ background: selected ? c.active : "transparent", color: c.text }}
              >
                <span className="eon-design-switcher-icon" style={{ background: selected ? c.raised : "transparent", color: selected ? c.brand : c.muted }}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="eon-design-switcher-copy">
                  <strong>{label}</strong>
                  <small style={{ color: c.muted }}>{description}</small>
                </span>
                <Check className="eon-design-switcher-check" size={16} aria-hidden="true" data-visible={selected || undefined} style={{ color: c.secondary }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
