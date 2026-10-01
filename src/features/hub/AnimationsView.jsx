import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Link2, RotateCcw } from "lucide-react";
import LiquidSegmentedControl from "@/components/LiquidSegmentedControl";
import { HUB } from "./prototypes";
import { animationStageDocument, animationsHref, extractAnimations } from "./animations";
import CodeView from "./CodeView";
import DeviceStage, { stageDevice } from "./DeviceStage";
import { useSystemTheme } from "@/lib/systemTheme";
import { copyText } from "@/lib/uiState";

/* The hosted page a developer opens from Assets: every animation a prototype
   declares, each playing on its own stage with its timing and code. */
export default function AnimationsView({ project, focusId }) {
  const hubTheme = useSystemTheme();
  const c = HUB[hubTheme];
  const [stageTheme, setStageTheme] = useState(hubTheme);
  const [device, setDevice] = useState(() => stageDevice(project?.prototype_html));
  const animations = useMemo(() => extractAnimations(project?.prototype_html), [project?.prototype_html]);

  useEffect(() => { document.title = `Animations · ${project?.title || "Eon"}`; }, [project?.title]);
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`animation-${focusId}`)?.scrollIntoView({ block: "start" });
  }, [focusId, animations.length]);

  return (
    <div className={`${hubTheme === "dark" ? "" : "light"} eon-anim-page`} style={{ background: c.bg, color: c.text }}>
      <header className="eon-anim-top" style={{ background: c.nav, borderColor: c.border }}>
        <a className="eon-buttonish eon-anim-back" href={`#/p/${encodeURIComponent(project.slug)}`} style={{ color: c.secondary }}>
          <ArrowLeft size={15} aria-hidden="true" /> {project.title}
        </a>
        <div className="eon-anim-switches">
          <LiquidSegmentedControl
            options={[{ value: "mobile", label: "Mobile" }, { value: "desktop", label: "Desktop" }]}
            value={device}
            onValueChange={setDevice}
            c={c}
            className="eon-anim-theme"
            ariaLabel="Screen the animations play on"
          />
          <LiquidSegmentedControl
            options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
            value={stageTheme}
            onValueChange={setStageTheme}
            c={c}
            className="eon-anim-theme"
            ariaLabel="Theme the animations play in"
          />
        </div>
      </header>
      <main className="eon-anim-main">
        <h1>Animations</h1>
        <p className="eon-anim-lede" style={{ color: c.secondary }}>
          Every animation in {project.title}, each on its own, with its code. Replay it, and check it on a phone or desktop in either theme.
        </p>
        {animations.length ? animations.map((animation) => (
          <AnimationCard key={animation.id} c={c} animation={animation} theme={stageTheme} device={device}
            slug={project.slug} focused={animation.id === focusId} />
        )) : (
          <p className="eon-anim-empty" style={{ background: c.panel, color: c.secondary, boxShadow: "var(--shadow-surface)" }}>
            {project.title} doesn't declare any animations yet. Rebuild it with the current setup prompt and they show up here.
          </p>
        )}
      </main>
    </div>
  );
}

function CopyAction({ c, text, icon: Icon, label, doneLabel = "Copied" }) {
  const [done, setDone] = useState(false);
  return (
    <button className="eon-buttonish eon-context-action eon-anim-action" type="button"
      onClick={async () => { await copyText(text); setDone(true); window.setTimeout(() => setDone(false), 1400); }}
      style={{ borderColor: c.border, color: done ? c.brand : c.secondary }}>
      {done ? <Check size={13} aria-hidden="true" /> : <Icon size={13} aria-hidden="true" />}
      {done ? doneLabel : label}
    </button>
  );
}

function AnimationCard({ c, animation, theme, device, slug, focused }) {
  const [run, setRun] = useState(0);
  const details = [
    ["Trigger", animation.trigger],
    ["Duration", animation.duration],
    ["Easing", animation.easing],
    ["Reduced motion", animation.reducedMotion],
  ].filter(([, value]) => value);
  const link = `${window.location.origin}${window.location.pathname}${animationsHref(slug, animation.id)}`;
  return (
    <section id={`animation-${animation.id}`} className="eon-anim-card"
      style={{ background: c.panel, boxShadow: focused ? `0 0 0 2px ${c.brand}` : "var(--shadow-surface)" }}>
      <header>
        <h2>{animation.name}</h2>
        <div className="eon-anim-actions">
          <button className="eon-buttonish eon-context-action eon-anim-action" type="button" onClick={() => setRun((count) => count + 1)}
            style={{ borderColor: c.border, color: c.secondary }}>
            <RotateCcw size={13} aria-hidden="true" /> Replay
          </button>
          <CopyAction c={c} text={link} icon={Link2} label="Copy link" />
        </div>
      </header>
      <div className={`eon-anim-body is-${device}`}>
        <DeviceStage key={`${device}-${theme}-${run}`} device={device} title={animation.name} height={device === "mobile" ? 600 : 520}
          srcDoc={animationStageDocument(animation, { theme })} />
        <div className="eon-anim-code-panel">
          <CodeView c={c} code={animation.code} />
        </div>
      </div>
      {details.length > 0 && (
        <dl className="eon-anim-details">
          {details.map(([label, value]) => (
            <div key={label}><dt style={{ color: c.muted }}>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      )}
    </section>
  );
}
