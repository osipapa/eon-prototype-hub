import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BarChart3, Check, ClipboardCheck, Code2, Copy, FileText,
} from "lucide-react";
import { copyText } from "@/lib/uiState";
import { MIXPANEL_TRACKING_EXAMPLE } from "./trackingExample";
import { WEBSITE_ATTRIBUTION } from "./websiteAttribution";

/* Tracking reference blocks rendered inside Eon Design pages. Each block is
   keyed by the `tracking` field on a design section. */
export default function TrackingBlock({ block, c, onOpenPrompts }) {
  const Block = BLOCKS[block];
  return Block ? <Block c={c} onOpenPrompts={onOpenPrompts} /> : null;
}

const shadow = "var(--shadow-surface)";
const mp = MIXPANEL_TRACKING_EXAMPLE;
const wa = WEBSITE_ATTRIBUTION;

/* ---------- Mixpanel ---------- */

function MixpanelSteps({ c }) {
  return (
    <div className="eon-tracking-steps">
      {mp.setupSteps.map((step, index) => (
        <div className="eon-tracking-step" key={step.title} style={{ background: c.panel, boxShadow: shadow }}>
          <span style={{ background: c.active, color: c.brand }}>{index + 1}</span>
          <div>
            <strong>{step.title}</strong>
            <p style={{ color: c.secondary }}>{step.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MixpanelEvent({ c }) {
  const event = mp.eventExample;
  return (
    <div className="eon-tracking-event" style={{ borderColor: c.border, background: c.panel }}>
      <div className="eon-tracking-event-head" style={{ borderColor: c.border }}>
        <div>
          <code style={{ background: c.raised, color: c.text }}>{event.name}</code>
          <p style={{ color: c.secondary }}>{event.trigger}</p>
          {event.note && <small style={{ color: c.muted }}>{event.note}</small>}
        </div>
      </div>
      <div className="eon-tracking-table-wrap">
        <table className="eon-tracking-table">
          <thead style={{ color: c.muted }}>
            <tr><th>Property</th><th>Type</th><th>Contract</th></tr>
          </thead>
          <tbody>
            {event.properties.map((property) => (
              <tr key={property.name} style={{ borderColor: c.border }}>
                <td><code>{property.name}</code>{property.required && <span title="Required">Required</span>}</td>
                <td style={{ color: c.secondary }}>{property.type}</td>
                <td style={{ color: c.secondary }}>
                  {property.values}
                  {property.risk && <em><AlertTriangle size={12} aria-hidden="true" />{property.risk}</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MixpanelPrompt({ c, onOpenPrompts }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    setCopyError("");
    try {
      await copyText(mp.setupPrompt);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError("Clipboard access was blocked. Open the Prompt Library to select and copy the template.");
    }
  };

  return (
    <div className="eon-tracking-prompt-card" style={{ background: c.panel, boxShadow: shadow }}>
      <div className="eon-prompt-use-head">
        <span className="eon-tracking-rail-icon eon-accent-icon" style={{ background: c.active, color: c.brand }}><BarChart3 size={17} /></span>
        <div>
          <strong>Setup prompt</strong>
          <p style={{ color: c.secondary }}>Turns a product flow into an implementation-ready Mixpanel tracking plan.</p>
        </div>
      </div>
      <div className="eon-tracking-prompt-actions">
        <button className="eon-buttonish eon-prompt-copy-primary" type="button" onClick={handleCopy} style={{ background: c.primary, color: c.primaryText }}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Prompt copied" : "Copy setup prompt"}
        </button>
        <button className="eon-buttonish eon-prompt-copy-secondary" type="button" onClick={onOpenPrompts} style={{ borderColor: c.border, color: c.secondary }}>
          <FileText size={15} />
          Open in Prompt Library
        </button>
      </div>
      {copyError && <p className="eon-prompt-copy-error" role="alert">{copyError}</p>}
      <div className="eon-tracking-meta" style={{ borderColor: c.border }}>
        <div><span>Platform</span><strong>{mp.platform}</strong></div>
        <div><span>Purpose</span><strong>Product analytics</strong></div>
        <div><span>Coverage</span><strong>{mp.coverage}</strong></div>
      </div>
    </div>
  );
}

function Checklist({ c, items, Icon, tone }) {
  return (
    <div className="eon-tracking-checklist" style={{ background: c.panel, boxShadow: shadow }}>
      {items.map((item) => (
        <div key={item} style={{ borderColor: c.border }}>
          <span className={`is-${tone}`}><Icon size={14} aria-hidden="true" /></span>
          <p style={{ color: c.secondary }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Websites: attribution & routing ---------- */

function Prose({ c, text }) {
  const paragraphs = Array.isArray(text) ? text : [text];
  return paragraphs.map((paragraph) => <p key={paragraph} className="eon-doc-p" style={{ color: c.secondary }}>{paragraph}</p>);
}

function Bullets({ c, items }) {
  return (
    <ul className="eon-doc-list" style={{ color: c.secondary }}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

/* Terminal-style code block, the way API docs show requests: a title bar
   with the language and a copy control, monospace body, comments dimmed. */
function Terminal({ title, lang = "text", code }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await copyText(code);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: the text is selectable */ }
  };
  return (
    <figure className="eon-term">
      <figcaption>
        <span>{title}</span>
        <em>{lang}</em>
        <button type="button" onClick={copy} aria-label={`Copy ${title}`}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button>
      </figcaption>
      <pre><code>{highlight(code, lang)}</code></pre>
    </figure>
  );
}

/* Dims trailing comments and HTML comments; leaves everything else as typed. */
function highlight(code, lang) {
  const commentStart = lang === "html" ? "<!--" : "//";
  return code.split("\n").map((line, index) => {
    const at = line.indexOf(commentStart);
    const isWholeComment = at >= 0 && line.slice(0, at).trim() === "";
    return (
      <span key={index} className="eon-term-line">
        {at < 0 ? line : (
          <>
            {line.slice(0, at)}
            <i className={isWholeComment ? "is-comment is-whole" : "is-comment"}>{line.slice(at)}</i>
          </>
        )}
        {"\n"}
      </span>
    );
  });
}

function DocTable({ c, head, rows, mono = [] }) {
  return (
    <div className="eon-doc-table-wrap" style={{ borderColor: c.border }}>
      <table className="eon-doc-table">
        <thead><tr>{head.map((h) => <th key={h} style={{ color: c.muted, borderColor: c.border }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ color: cellIndex === 0 ? c.text : c.secondary, borderColor: c.border }}>
                  {mono.includes(cellIndex) ? <code className="eon-doc-code">{cell}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttrOverview({ c }) {
  return (
    <>
      <Prose c={c} text={wa.intro} />
      <p className="eon-doc-p" style={{ color: c.secondary }}>In order, the script:</p>
      <Bullets c={c} items={wa.jobs} />
    </>
  );
}

function SystemMap({ c }) {
  const Box = ({ x, y, w, h, title, sub, accent }) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={c.bg} stroke={accent ? c.brand : c.border} strokeWidth={accent ? 1.5 : 1} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 4)} textAnchor="middle" fill={c.text} fontSize="11.5" fontWeight="600">{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fill={c.muted} fontSize="9.5">{sub}</text>}
    </g>
  );
  const Label = ({ x, y, children, anchor = "middle" }) => (
    <text x={x} y={y} textAnchor={anchor} fill={c.muted} fontSize="9.5" fontStyle="italic">{children}</text>
  );
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-attr-arrow)" };
  return (
    <figure className="eon-doc-figure" style={{ background: c.panel, boxShadow: shadow }}>
      <svg viewBox="0 0 760 470" role="img" aria-label="Where a click goes: an ad opens a page on www.eonrides.com, the script builds the OneLink, AppsFlyer OneLink sends the person to the app, to the redirect page and then the store or the web app, or to the web app on desktop.">
        <defs>
          <marker id="eon-attr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c.muted} />
          </marker>
        </defs>
        <Box x={12} y={28} w={150} h={54} title="Ad" sub="?utm_…&fbclid&code" />
        <path d="M162,55 L226,55" {...line} />
        <Box x={228} y={22} w={330} h={66} title="www.eonrides.com" sub="the script builds the OneLink for each button" accent />
        <path d="M393,88 L393,140" {...line} />
        <Label x={402} y={118} anchor="start">the person taps a button</Label>
        <Box x={228} y={142} w={330} h={66} title="go.eonrides.com/nQbG/…" sub="AppsFlyer OneLink records the click and picks a destination" />
        <path d="M300,208 L300,240 L120,240 L120,288" {...line} />
        <path d="M393,208 L393,288" {...line} />
        <path d="M486,208 L486,240 L640,240 L640,288" {...line} />
        <Label x={120} y={276}>app installed</Label>
        <Label x={393} y={276}>no app</Label>
        <Label x={640} y={276}>desktop</Label>
        <Box x={20} y={290} w={200} h={62} title="Eon app" sub="opens the named screen" />
        <Box x={283} y={290} w={220} h={62} title="/app-redirect-ios or -android" sub="a page on the site" />
        <Box x={540} y={290} w={200} h={62} title="app.eonrides.com" sub="the web app" />
        <path d="M340,352 L340,400" {...line} />
        <path d="M446,352 L446,400" {...line} />
        <Box x={232} y={402} w={200} h={56} title="App Store or Google Play" sub="first open still lands on the screen" />
        <Box x={456} y={402} w={200} h={56} title="Continue on web" sub="to app.eonrides.com, details kept" />
      </svg>
    </figure>
  );
}

function CampaignUrl({ c }) {
  return (
    <>
      <Prose c={c} text={wa.urlIntro} />
      <Terminal title="Campaign link" lang="url" code={wa.landingUrl} />
      <Terminal title="Example, a Meta subscription ad" lang="url" code={wa.landingExample} />
      <DocTable c={c} head={["Parameter", "What it means", "What the script does with it"]} mono={[0]} rows={wa.urlParams.map((p) => [p.name, p.meaning, p.kept])} />
      <Prose c={c} text={wa.urlNote} />
    </>
  );
}

function Memory({ c }) {
  return (
    <>
      <Prose c={c} text={wa.memoryIntro} />
      <Terminal title="localStorage · eon_attr" lang="json" code={wa.snapshot} />
      <Prose c={c} text={wa.precedenceIntro} />
      <DocTable c={c} head={["Value", "Taken from"]} rows={wa.precedence.map((row) => [row.value, row.order])} />
      <Prose c={c} text={wa.precedenceNote} />
    </>
  );
}

function Buttons({ c }) {
  return (
    <>
      <Prose c={c} text={wa.buttonsIntro} />
      <Terminal title="Button in Webflow" lang="html" code={wa.buttonMarkup} />
      <DocTable c={c} head={["data-onelink", "Opens"]} mono={[0, 1]} rows={wa.onelinkKeys.map((row) => [row.key, row.url])} />
      <Prose c={c} text={wa.stampIntro} />
      <Terminal title="The link, as tapped" lang="url" code={wa.stampExample} />
      <Prose c={c} text={wa.stampNote} />
    </>
  );
}

function DeepLink({ c }) {
  return (
    <>
      <Prose c={c} text={wa.deepLinkIntro} />
      <Terminal title="deep_link_value" lang="json" code={wa.dlvShape} />
      <Prose c={c} text={wa.overrideIntro} />
      <DocTable c={c} head={["Button", "What the script sends"]} rows={wa.dlvRules.map((row) => [row.when, row.sends])} />
      <Prose c={c} text={wa.dlvNote} />
    </>
  );
}

function AcrossPages({ c }) {
  return (
    <>
      <Prose c={c} text={wa.forwardIntro} />
      <DocTable c={c} head={["Hop", "Carried as", "Who reads it"]} mono={[1]} rows={wa.identity.map((row) => [row.hop, row.carrier, row.consumer])} />
    </>
  );
}

function ComingBack({ c }) {
  return (
    <>
      <Prose c={c} text={wa.returnIntro} />
      <DocTable c={c} head={["AppsFlyer sends", "The script reads it as"]} mono={[0, 1]} rows={wa.normalize.map((row) => [row.from, row.to])} />
      <Prose c={c} text={[wa.normalizeNote, wa.redirectIntro]} />
    </>
  );
}

function Devices({ c }) {
  return <DocTable c={c} head={["Device", "What happens"]} rows={wa.outcomes.map((row) => [row.device, row.happens])} />;
}

function Examples({ c }) {
  return <DocTable c={c} head={["The visit", "What the Subscribe button carries"]} rows={wa.examples.map((row) => [row.visit, row.result])} />;
}

function Settings({ c }) {
  return (
    <>
      <Terminal title="Top of the script" lang="js" code={wa.config} />
      <DocTable c={c} head={["Identifier", "Value"]} mono={[1]} rows={wa.identifiers.map((row) => [row.label, row.value])} />
      <Prose c={c} text={wa.appsflyerIntro} />
      <DocTable c={c} head={["AppsFlyer setting", "Value"]} mono={[1]} rows={wa.appsflyer.map((row) => [row.setting, row.value])} />
      <p className="eon-doc-p" style={{ color: c.secondary }}>Outside the script, each app has one thing to do:</p>
      <DocTable c={c} head={["Surface", "What it has to do"]} rows={wa.appSide.map((row) => [row.surface, row.detail])} />
    </>
  );
}

function Console({ c }) {
  return (
    <>
      <Prose c={c} text={wa.consoleIntro} />
      <Terminal title="Browser console" lang="js" code={wa.debug} />
    </>
  );
}

const BLOCKS = {
  "mixpanel-steps": MixpanelSteps,
  "mixpanel-event": MixpanelEvent,
  "mixpanel-guardrails": ({ c }) => <Checklist c={c} items={mp.guardrails} Icon={Code2} tone="info" />,
  "mixpanel-qa": ({ c }) => <Checklist c={c} items={mp.qa} Icon={ClipboardCheck} tone="success" />,
  "mixpanel-prompt": MixpanelPrompt,
  "attr-overview": AttrOverview,
  "attr-map": SystemMap,
  "attr-url": CampaignUrl,
  "attr-memory": Memory,
  "attr-buttons": Buttons,
  "attr-deeplink": DeepLink,
  "attr-across": AcrossPages,
  "attr-return": ComingBack,
  "attr-devices": Devices,
  "attr-examples": Examples,
  "attr-settings": Settings,
  "attr-console": Console,
};
