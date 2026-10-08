import { useEffect, useState } from "react";

export function scrollToSection(id) {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
}

/* "Contents": the page's H2s and H3s, with the one you are reading marked.
   HashRouter reads a bare #id as a route, so links scroll instead. */
export default function DocsToc({ items, scrollRef, c }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !items.length) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = root.getBoundingClientRect().top + 96;
      let current = items[0].id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= top) current = item.id;
      }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = items[items.length - 1].id;
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => { root.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [items, scrollRef]);

  if (items.length < 2) return null;
  return (
    <nav className="eon-docs-toc" aria-label="Contents">
      <strong style={{ color: c.text }}>Contents</strong>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`is-depth-${item.depth}${active === item.id ? " is-active" : ""}`}
          aria-current={active === item.id ? "location" : undefined}
          style={{ color: active === item.id ? c.brand : c.muted, borderColor: active === item.id ? c.brand : "transparent" }}
          onClick={(event) => { event.preventDefault(); scrollToSection(item.id); }}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}
