import { useState } from "react";
import { ExternalLink, Play, RotateCcw } from "lucide-react";
import { animationStageDocument, animationsHref } from "./animations";
import DeviceStage from "./DeviceStage";

// What the Assets row reads when collapsed: the animation names, or that there are none.
export function assetsSummary(animations) {
  return animations.length ? animations.map((animation) => animation.name).join(", ") : "No animations";
}

/* The prototype's animations, each isolated so a developer can watch it on its
   own here or open it on the hosted Animations page, with its code. */
export default function AssetsList({ c, animations, story, theme, device }) {
  const [openId, setOpenId] = useState(null);
  const [replay, setReplay] = useState(0);

  if (!animations.length) {
    return (
      <p className="eon-context-note" style={{ color: c.muted }}>
        {story.prototype_html
          ? "This prototype doesn't declare any animations. Rebuild it with the current setup prompt and each one shows up here."
          : "Upload the prototype's HTML to see its animations here."}
      </p>
    );
  }

  return (
    <>
      <ul className="eon-assets">
        {animations.map((animation) => {
          const open = openId === animation.id;
          const meta = [animation.trigger, animation.duration, animation.easing].filter(Boolean).join(" · ");
          return (
            <li key={animation.id} style={{ background: c.raised }}>
              <div className="eon-asset-head">
                <button className="eon-buttonish eon-asset-toggle" onClick={() => setOpenId(open ? null : animation.id)}
                  aria-expanded={open} aria-label={`${open ? "Hide" : "Preview"} ${animation.name}`}>
                  <Play size={13} aria-hidden="true" style={{ color: open ? c.text : c.muted }} />
                  <span>
                    <strong style={{ color: c.text }}>{animation.name}</strong>
                    {meta && <small style={{ color: c.muted }}>{meta}</small>}
                  </span>
                </button>
                <a className="eon-buttonish eon-icon-button eon-asset-open" href={animationsHref(story.slug, animation.id)}
                  target="_blank" rel="noopener" aria-label={`Open ${animation.name} with its code`} title="Open with its code"
                  style={{ color: c.muted }}>
                  <ExternalLink size={15} />
                </a>
              </div>
              {open && (
                <div className="eon-asset-stage">
                  <DeviceStage key={replay} device={device} title={`${animation.name} preview`} height={device === "mobile" ? 320 : 220}
                    srcDoc={animationStageDocument(animation, { theme })} />
                  <button className="eon-buttonish eon-asset-replay" onClick={() => setReplay((count) => count + 1)}
                    style={{ background: c.nav, color: c.secondary, borderColor: c.border }}>
                    <RotateCcw size={13} aria-hidden="true" /> Replay
                  </button>
                  {animation.reducedMotion && <p className="eon-context-note" style={{ color: c.muted }}>Reduced motion: {animation.reducedMotion}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <a className="eon-buttonish eon-context-action eon-assets-all" href={animationsHref(story.slug)} target="_blank" rel="noopener"
        style={{ borderColor: c.border, color: c.secondary }}>
        <ExternalLink size={13} aria-hidden="true" /> Open all animations
      </a>
    </>
  );
}
