import { useState } from "react";
import { Columns2 } from "lucide-react";

// Sidebar rows and pane headers both carry this, so either can land on a half.
export const PROTOTYPE_DRAG_TYPE = "application/x-eon-prototype";

export function startPrototypeDrag(event, id) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(PROTOTYPE_DRAG_TYPE, id);
}

/* Over the canvas while a prototype is dragged: one half per side, each
   labelled with what a drop there does. A half with no label takes no drop.
   The halves sit above the prototype frames, which would swallow the drag. */
export default function SplitDropZones({ c, halves, onDrop, onDragEnter }) {
  const [over, setOver] = useState(null);
  return (
    <div className="eon-split-drop" onDragEnter={onDragEnter}>
      {["left", "right"].map((side) => {
        const label = halves[side];
        const hot = Boolean(label) && over === side;
        return (
          <div key={side} className={`eon-split-drop-half${label ? "" : " is-idle"}`}
            onDragOver={(event) => {
              if (!label) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (over !== side) setOver(side);
            }}
            onDragLeave={() => setOver((current) => (current === side ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              setOver(null);
              if (label) onDrop(event.dataTransfer.getData(PROTOTYPE_DRAG_TYPE), side);
            }}
            style={{
              borderColor: label ? (hot ? c.brand : c.border) : "transparent",
              background: hot ? `color-mix(in srgb, ${c.brand} 10%, transparent)` : "transparent",
            }}>
            {label && (
              <span className="eon-split-drop-label"
                style={{ background: c.panel, color: hot ? c.brand : c.secondary, boxShadow: "var(--shadow-surface)" }}>
                <Columns2 size={15} aria-hidden="true" /> {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
