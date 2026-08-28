import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Liquid } from "liquid-gooey";

const MOVE_TUNING = {
  springiness: 0.66,
  wobble: 0.18,
  stretch: 0.3,
  trail: 0.42,
};

function sameIndicator(a, b) {
  return a?.x === b.x
    && a?.y === b.y
    && a?.width === b.width
    && a?.height === b.height;
}

/**
 * Keeps the controls as ordinary, accessible buttons while liquid-gooey owns
 * only the decorative selection surface beneath them.
 */
export default function LiquidSegmentedControl({
  options,
  value,
  onValueChange,
  c,
  className = "",
  ariaLabel,
  disabled = false,
  variant = "text",
}) {
  const rootRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const [indicator, setIndicator] = useState(null);
  const normalized = useMemo(() => options.map((option) => (
    typeof option === "string"
      ? { value: option, label: option }
      : option
  )), [options]);
  const optionKey = normalized.map((option) => option.value).join("\u0000");

  const measure = useCallback(() => {
    const root = rootRef.current;
    const active = buttonRefs.current.get(value);
    if (!root || !active) return;
    const rootRect = root.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const next = {
      x: activeRect.left - rootRect.left,
      y: activeRect.top - rootRect.top,
      width: activeRect.width,
      height: activeRect.height,
    };
    setIndicator((current) => (sameIndicator(current, next) ? current : next));
  }, [value]);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (rootRef.current) observer.observe(rootRef.current);
    buttonRefs.current.forEach((button) => observer.observe(button));
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, optionKey]);

  const moveFocus = (event) => {
    const current = normalized.findIndex((option) => option.value === value);
    if (current < 0) return;
    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % normalized.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + normalized.length) % normalized.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = normalized.length - 1;
    else return;
    event.preventDefault();
    const nextOption = normalized[next];
    onValueChange(nextOption.value);
    buttonRefs.current.get(nextOption.value)?.focus();
  };

  return (
    <div
      className={`eon-liquid-segment-shell is-${variant}`}
      style={{ background: c.raised, boxShadow: c.well, opacity: disabled ? 0.45 : 1 }}
    >
      <Liquid
        ref={rootRef}
        className={`eon-liquid-segment ${className}`.trim()}
        blur={5}
        contrast={19}
        fill={c.selected}
        filterPadding={18}
        role="group"
        aria-label={ariaLabel}
        onKeyDown={moveFocus}
      >
        {indicator && (
          <Liquid.Item effect="move" move={MOVE_TUNING}>
            <span
              className="eon-liquid-segment-indicator"
              aria-hidden="true"
              style={{
                width: indicator.width,
                height: indicator.height,
                transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
              }}
            />
          </Liquid.Item>
        )}
        {normalized.map((option) => {
          const selected = option.value === value;
          const Icon = option.Icon;
          return (
            <button
              ref={(node) => {
                if (node) buttonRefs.current.set(option.value, node);
                else buttonRefs.current.delete(option.value);
              }}
              key={option.value}
              type="button"
              className={`eon-buttonish eon-liquid-segment-button${variant === "icon" ? " eon-icon-button" : ""}${option.className ? ` ${option.className}` : ""}`}
              data-tutorial={option.tutorial}
              onClick={() => onValueChange(option.value)}
              aria-label={option.ariaLabel}
              aria-pressed={selected}
              title={option.title}
              disabled={disabled || option.disabled}
              style={{ color: selected ? c.selectedText : c.muted }}
            >
              {Icon ? <Icon size={option.iconSize || 16} aria-hidden="true" /> : option.label}
            </button>
          );
        })}
      </Liquid>
    </div>
  );
}
