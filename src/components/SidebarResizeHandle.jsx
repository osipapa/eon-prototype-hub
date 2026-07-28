import { useEffect, useMemo, useState } from "react";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function useResizableSidebar(
  storageKey,
  { initial = 284, min = 240, max = 440, edge = "right" } = {},
) {
  const [width, setWidth] = useState(() => {
    try {
      return clamp(Number(window.localStorage.getItem(storageKey)) || initial, min, max);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(width));
    } catch {
      // Resizing still works for the current session when storage is blocked.
    }
  }, [storageKey, width]);

  const resize = useMemo(() => ({
    width,
    min,
    max,
    edge,
    onPointerDown(event) {
      if (event.button !== 0) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;
      const direction = edge === "left" ? -1 : 1;
      const previousCursor = document.body.style.cursor;
      const previousSelection = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const move = (moveEvent) => {
        setWidth(clamp(startWidth + ((moveEvent.clientX - startX) * direction), min, max));
      };
      const finish = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelection;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    },
    onKeyDown(event) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") {
        setWidth(min);
        return;
      }
      if (event.key === "End") {
        setWidth(max);
        return;
      }
      const direction = edge === "left" ? -1 : 1;
      const keyboardDelta = (event.key === "ArrowRight" ? 12 : -12) * direction;
      setWidth((current) => clamp(current + keyboardDelta, min, max));
    },
  }), [edge, max, min, width]);

  return resize;
}

export default function SidebarResizeHandle({ resize, label }) {
  return (
    <div
      className={`eon-sidebar-resizer is-${resize.edge}-edge`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={resize.min}
      aria-valuemax={resize.max}
      aria-valuenow={Math.round(resize.width)}
      onPointerDown={resize.onPointerDown}
      onKeyDown={resize.onKeyDown}
    />
  );
}
