import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Moon, Sun } from "lucide-react";
import EonMark from "@/components/EonMark";
import { embedViewQuery, hubPrototypeUrl } from "@/lib/embed";
import DeviceShell from "./DeviceShell";
import {
  HUB, PROTOTYPE_SANDBOX, VIEWPORTS, currentArgs, effectiveStory, parsePrototypeConfig, renderStory,
} from "./prototypes";

/* A prototype embedded in someone else's page, the way a Figma link embeds:
   the live prototype fit to the space, in its device frame, under a thin bar
   with its title, its states, a theme switch, and a way into the hub. */
export default function EmbedView({ prototype, initialView }) {
  const story = useMemo(() => effectiveStory(prototype), [prototype]);
  const designedFor = useMemo(() => parsePrototypeConfig(prototype.prototype_html).viewport, [prototype.prototype_html]);
  const [theme, setTheme] = useState(() => initialView.theme || systemTheme());
  const [chosen, setChosen] = useState(initialView.args);
  const viewport = initialView.viewport || designedFor || "desktop";
  const vp = VIEWPORTS[viewport];
  const media = useMemo(() => prototype.media || {}, [prototype.media]);
  const args = useMemo(() => currentArgs(story, chosen), [story, chosen]);
  const html = useMemo(() => renderStory(story, theme, media, args), [story, theme, media, args]);
  const c = HUB[theme];
  const controls = story.controls || [];
  const hubHref = hubPrototypeUrl(story.slug, embedViewQuery({ viewport, theme, args, defaults: story.defaults }));

  const stageRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;
    const update = (width, height) => setSize((current) => (
      current.width === width && current.height === height ? current : { width, height }));
    const rect = node.getBoundingClientRect();
    update(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width, entry.contentRect.height));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { document.title = `${story.title} · Eon`; }, [story.title]);

  // Room for the phone shell, which is drawn outside the frame box.
  const shell = viewport === "mobile" ? 34 : 0;
  const pad = size.width < 480 ? 12 : 24;
  const scale = Math.max(0.1, Math.min(
    (size.width - pad * 2) / (vp.w + shell),
    (size.height - pad * 2) / (vp.h + shell),
    1,
  ));

  return (
    <div className={`eon-embed ${theme}`} style={{ background: initialView.canvas || c.bg, color: c.text }}>
      <header className="eon-embed-bar" style={{ background: c.nav, borderColor: c.border }}>
        <a className="eon-embed-title" href={hubHref} target="_blank" rel="noopener noreferrer" title="Open in Eon Design Hub" style={{ color: c.text }}>
          <EonMark src={media.eonLogo} className="eon-embed-logo" size={20} />
          <span>{story.title}</span>
        </a>
        {controls.length > 0 && (
          <div className="eon-embed-states" role="group" aria-label="Prototype state">
            {controls.map((control) => {
              const index = control.options.findIndex((option) => String(option) === String(args[control.key]));
              return (
                <label key={control.key} className="eon-embed-select" style={{ background: c.raised }}>
                  <span style={{ color: c.muted }}>{control.label || control.key}</span>
                  <select value={Math.max(0, index)} style={{ color: c.text }}
                    onChange={(event) => {
                      const value = control.options[Number(event.target.value)];
                      setChosen((current) => ({ ...current, [control.key]: value }));
                    }}>
                    {control.options.map((option, optionIndex) => (
                      <option key={optionIndex} value={optionIndex}>{String(option)}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} aria-hidden="true" style={{ color: c.muted }} />
                </label>
              );
            })}
          </div>
        )}
        <div className="eon-embed-actions">
          <button type="button" className="eon-buttonish eon-icon-button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"} style={{ color: c.muted }}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <a className="eon-buttonish eon-embed-open" href={hubHref} target="_blank" rel="noopener noreferrer"
            aria-label="Open in Eon Design Hub" style={{ background: c.primary, color: c.primaryText }}>
            <ExternalLink size={13} aria-hidden="true" /><span>Open in Eon</span>
          </a>
        </div>
      </header>
      <main ref={stageRef} className="eon-embed-stage">
        {size.width > 0 && (
          <div className={`eon-stage-frame${viewport === "mobile" ? " is-device" : ""}${viewport === "mobile" && media.iPhone ? " has-mockup" : ""}`}
            style={{ width: vp.w * scale, height: vp.h * scale, position: "relative", "--device-scale": scale }}>
            {viewport === "mobile" && <DeviceShell frame={media.iPhone} scale={scale} />}
            <iframe className="eon-prototype-frame"
              key={`${theme}-${JSON.stringify(args)}`}
              title={story.title} srcDoc={html}
              sandbox={PROTOTYPE_SANDBOX}
              referrerPolicy="no-referrer"
              allow="clipboard-read; clipboard-write"
              style={{ width: vp.w, height: vp.h, colorScheme: theme, transform: `scale(${scale})`, transformOrigin: "top left" }} />
          </div>
        )}
      </main>
    </div>
  );
}

function systemTheme() {
  try { return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; }
  catch { return "dark"; }
}
