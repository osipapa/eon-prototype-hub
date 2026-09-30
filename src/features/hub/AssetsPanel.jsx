import { useState } from "react";
import { Download, Play, RotateCcw } from "lucide-react";
import { animationDocument, animationFileName, animationStageDocument, zipFiles } from "./animations";

function saveFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// What the Assets row reads when collapsed: the animation names, or that there are none.
export function assetsSummary(animations) {
  return animations.length ? animations.map((animation) => animation.name).join(", ") : "No animations";
}

/* The prototype's animations, each isolated so a developer can watch it on its
   own and download it as a standalone page (or all of them as a zip). */
export default function AssetsList({ c, animations, story, theme }) {
  const [openId, setOpenId] = useState(null);
  const [replay, setReplay] = useState(0);
  const docFor = (animation) => animationDocument(animation, { theme, prototypeTitle: story.title });
  const download = (animation) => saveFile(docFor(animation), animationFileName(animation, story.slug), "text/html");
  const downloadAll = () => saveFile(
    zipFiles(animations.map((animation) => ({ name: animationFileName(animation, story.slug), content: docFor(animation) }))),
    `${story.slug || "prototype"}-animations.zip`,
    "application/zip",
  );

  if (!animations.length) {
    return (
      <p className="eon-context-note" style={{ color: c.muted }}>
        {story.prototype_html
          ? "No animations found. Prototypes built with the current setup prompt declare each one so it shows up here."
          : "Upload the prototype's HTML to see its animations here."}
      </p>
    );
  }

  const detected = animations.some((animation) => animation.source === "detected");
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
                <button className="eon-buttonish eon-icon-button eon-asset-download" onClick={() => download(animation)}
                  aria-label={`Download ${animation.name}`} title="Download as HTML" style={{ color: c.muted }}>
                  <Download size={15} />
                </button>
              </div>
              {open && (
                <div className="eon-asset-stage">
                  <iframe key={replay} title={`${animation.name} preview`} sandbox="allow-scripts"
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
      {detected && (
        <p className="eon-context-note" style={{ color: c.muted }}>
          Found in the prototype's CSS and shown on a sample shape. Rebuild it with the current setup prompt for exact demos.
        </p>
      )}
      <button className="eon-buttonish eon-context-action eon-assets-all" onClick={downloadAll} style={{ borderColor: c.border, color: c.secondary }}>
        <Download size={13} aria-hidden="true" /> Download all (.zip)
      </button>
    </>
  );
}
