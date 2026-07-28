import { BarChart3, BookOpen, Monitor } from "lucide-react";

const PRODUCTS = [
  { id: "prototypes", label: "Prototypes", Icon: Monitor },
  { id: "prompts", label: "Prompts", Icon: BookOpen },
  { id: "tracking", label: "Tracking", Icon: BarChart3 },
];

export default function DesignHubSwitcher({ active, c, onSelect }) {
  return (
    <nav className="eon-product-switcher" aria-label="Design Hub areas" style={{ background: c.raised }}>
      {PRODUCTS.map(({ id, label, Icon }) => {
        const selected = active === id;
        return (
          <button
            className="eon-buttonish"
            key={id}
            type="button"
            onClick={() => onSelect?.(id)}
            aria-current={selected ? "page" : undefined}
            aria-label={label}
            title={label}
            style={{
              background: selected ? c.panel : "transparent",
              color: selected ? c.text : c.muted,
            }}
          >
            <Icon size={14} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
