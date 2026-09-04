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

/* Terminal palette (One Dark) and a small per-language tokenizer. Each
   language is an ordered list of [regex, class]; the first pattern that
   matches at the cursor wins. Comments need a space before the slashes so
   https:// is never read as one. */
const COMMENT = /(?:^|\s)\/\/ .*$/;
const GRAMMAR = {
  url: [
    [COMMENT, "comment"],
    [/<[^>]+>/, "placeholder"],
    [/https?:\/\/[^\s/?]+/, "host"],
    [/[?&]/, "punct"],
    [/[\w-]+(?==)/, "attr"],
    [/=/, "punct"],
    [/(?<==)[^&\s]+/, "string"],
  ],
  json: [
    [COMMENT, "comment"],
    [/"[^"]*"(?=\s*:)/, "key"],
    [/"[^"]*"/, "string"],
    [/\b\d+(?:\.\d+)?\b/, "number"],
    [/[{}[\]:,]/, "punct"],
  ],
  js: [
    [COMMENT, "comment"],
    [/'[^']*'|"[^"]*"/, "string"],
    [/\b(?:const|let|var|return|new|function)\b/, "keyword"],
    [/\b(?:window|document|null|true|false)\b/, "key"],
    [/(?<=\.)[\w$]+(?=\()/, "fn"],
    [/[\w$]+(?=\s*:)/, "attr"],
    [/\b[A-Z][A-Z_]+\b/, "key"],
    [/\b\d+(?:\.\d+)?\b/, "number"],
    [/[{}()[\];,=.*+]/, "punct"],
  ],
  html: [
    [/<!--.*?-->/, "comment"],
    [/<\/?[\w-]+/, "tag"],
    [/\/?>/, "tag"],
    [/[\w-]+(?==)/, "attr"],
    [/"[^"]*"/, "string"],
  ],
};
GRAMMAR.console = GRAMMAR.js;

function tokenize(line, rules) {
  const out = [];
  let i = 0;
  let plain = "";
  while (i < line.length) {
    let hit = null;
    for (const [pattern, cls] of rules) {
      const re = new RegExp(pattern.source, "y" + (pattern.flags.includes("m") ? "m" : ""));
      re.lastIndex = i;
      const m = re.exec(line);
      if (m && m[0].length > 0) { hit = [m[0], cls]; break; }
    }
    if (!hit) { plain += line[i]; i += 1; continue; }
    if (plain) { out.push(plain); plain = ""; }
    out.push(<i key={i} className={`tk-${hit[1]}`}>{hit[0]}</i>);
    i += hit[0].length;
  }
  if (plain) out.push(plain);
  return out;
}

function highlight(code, lang) {
  const rules = GRAMMAR[lang] || [[COMMENT, "comment"]];
  const prompt = lang === "console";
  return code.split("\n").map((line, index) => {
    const isCommand = prompt && line.trim() && !line.trim().startsWith("//");
    return (
      <span key={index} className="eon-term-line">
        {isCommand && <b className="tk-prompt" aria-hidden="true">{"> "}</b>}
        {tokenize(line, rules)}
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

/* Shared SVG bits for the figures. Each figure is a panel with an
   optional caption; boxes and labels take their colours from the hub theme. */
function Figure({ c, label, caption, viewBox, minWidth = 620, children }) {
  return (
    <figure className="eon-doc-figure" style={{ background: c.panel, boxShadow: shadow }}>
      <svg viewBox={viewBox} role="img" aria-label={label} style={{ minWidth }}>{children}</svg>
      {caption && <figcaption style={{ color: c.muted }}>{caption}</figcaption>}
    </figure>
  );
}

function Arrow({ id, c }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={c.muted} />
      </marker>
    </defs>
  );
}

function Box({ c, x, y, w, h, title, sub, accent, mono }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={c.bg} stroke={accent ? c.brand : c.border} strokeWidth={accent ? 1.5 : 1} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 4)} textAnchor="middle" fill={c.text} fontSize="11.5" fontWeight="600" fontFamily={mono ? MONO : undefined}>{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fill={c.muted} fontSize="9.5">{sub}</text>}
    </g>
  );
}

function Note({ c, x, y, anchor = "middle", children }) {
  return <text x={x} y={y} textAnchor={anchor} fill={c.muted} fontSize="9.5" fontStyle="italic">{children}</text>;
}

const MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

function SystemMap({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-map)" };
  return (
    <Figure c={c} viewBox="0 0 760 470" label="Where a click goes: an ad opens a page on www.eonrides.com, the script builds the OneLink, AppsFlyer OneLink sends the person to the app, to the redirect page and then the store or the web app, or to the web app on desktop.">
      <Arrow id="eon-fig-map" c={c} />
      <Box c={c} x={12} y={28} w={150} h={54} title="Ad" sub="?utm_…&fbclid&code" />
      <path d="M162,55 L226,55" {...line} />
      <Box c={c} x={228} y={22} w={330} h={66} title="www.eonrides.com" sub="the script builds the OneLink for each button" accent />
      <path d="M393,88 L393,140" {...line} />
      <Note c={c} x={402} y={118} anchor="start">the person taps a button</Note>
      <Box c={c} x={228} y={142} w={330} h={66} title="go.eonrides.com/nQbG/…" sub="AppsFlyer OneLink records the click and picks a destination" />
      <path d="M300,208 L300,240 L120,240 L120,288" {...line} />
      <path d="M393,208 L393,288" {...line} />
      <path d="M486,208 L486,240 L640,240 L640,288" {...line} />
      <Note c={c} x={120} y={276}>app installed</Note>
      <Note c={c} x={393} y={276}>no app</Note>
      <Note c={c} x={640} y={276}>desktop</Note>
      <Box c={c} x={20} y={290} w={200} h={62} title="Eon app" sub="opens the named screen" />
      <Box c={c} x={283} y={290} w={220} h={62} title="/app-redirect-ios or -android" sub="a page on the site" />
      <Box c={c} x={540} y={290} w={200} h={62} title="app.eonrides.com" sub="the web app" />
      <path d="M340,352 L340,400" {...line} />
      <path d="M446,352 L446,400" {...line} />
      <Box c={c} x={232} y={402} w={200} h={56} title="App Store or Google Play" sub="first open still lands on the screen" />
      <Box c={c} x={456} y={402} w={200} h={56} title="Continue on web" sub="to app.eonrides.com, details kept" />
    </Figure>
  );
}

/* The same person over a month: what the snapshot holds after each visit. */
function MemoryTimeline({ c }) {
  const axisY = 118;
  const visits = [
    { x: 80, day: "Day 0", what: "Meta ad, code EON99", carries: "Meta · EON99" },
    { x: 250, day: "Day 1", what: "typed the URL", carries: "Meta · EON99" },
    { x: 420, day: "Day 10", what: "Google ad, code EON50", carries: "Meta · EON50" },
    { x: 660, day: "Day 31", what: "typed the URL", carries: "nothing" },
  ];
  const expiry = 590;
  return (
    <Figure c={c} viewBox="0 0 760 236" label="Timeline of four visits over 31 days. The first ad stays on record for 30 days; the promo code changes with each new one; after 30 days everything is forgotten."
      caption="The first ad is kept for 30 days, whatever comes later. The promo code is always the most recent one. After 30 days the script starts from nothing.">
      <line x1={40} y1={axisY} x2={720} y2={axisY} stroke={c.border} strokeWidth="1" />
      {visits.map((v) => (
        <g key={v.day}>
          <circle cx={v.x} cy={axisY} r="5" fill={v.carries === "nothing" ? c.panel : c.brand} stroke={v.carries === "nothing" ? c.muted : c.brand} strokeWidth="1.5" />
          <text x={v.x} y={axisY - 34} textAnchor="middle" fill={c.text} fontSize="11.5" fontWeight="600">{v.day}</text>
          <text x={v.x} y={axisY - 19} textAnchor="middle" fill={c.muted} fontSize="9.5">{v.what}</text>
          <text x={v.x} y={axisY + 30} textAnchor="middle" fill={c.muted} fontSize="9.5">the Subscribe link carries</text>
          <text x={v.x} y={axisY + 45} textAnchor="middle" fill={c.text} fontSize="11" fontWeight="600" fontFamily={MONO}>{v.carries}</text>
        </g>
      ))}
      <rect x={80} y={axisY + 62} width={expiry - 80} height="18" rx="9" fill={c.brand} opacity=".18" />
      <text x={90} y={axisY + 75} fill={c.text} fontSize="10">first touch: Meta, fbclid · kept 30 days</text>
      <rect x={80} y={axisY + 86} width={420 - 80} height="18" rx="9" fill={c.muted} opacity=".18" />
      <text x={90} y={axisY + 99} fill={c.text} fontSize="10">code EON99</text>
      <rect x={420} y={axisY + 86} width={expiry - 420} height="18" rx="9" fill={c.muted} opacity=".3" />
      <text x={430} y={axisY + 99} fill={c.text} fontSize="10">code EON50</text>
      <line x1={expiry} y1={axisY - 6} x2={expiry} y2={axisY + 108} stroke={c.muted} strokeWidth="1" strokeDasharray="3 3" />
      <text x={expiry + 6} y={axisY + 75} fill={c.muted} fontSize="9.5" fontStyle="italic">day 30: forgotten</text>
    </Figure>
  );
}

/* Webflow attributes in, a full OneLink out. */
function ButtonFlow({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-btn)" };
  const row = (x, y, text, bold) => <text key={text} x={x} y={y} fill={bold ? c.text : c.secondary} fontSize="10" fontFamily={MONO}>{text}</text>;
  return (
    <Figure c={c} viewBox="0 0 760 210" label="A button with two attributes becomes a OneLink from the script's table on page load, and the campaign details are added when it is tapped."
      caption="Two attributes in Webflow. The script supplies the URL on page load and the campaign details on tap.">
      <Arrow id="eon-fig-btn" c={c} />
      <rect x={12} y={30} width={216} height={150} rx="10" fill={c.bg} stroke={c.border} />
      <text x={24} y={52} fill={c.text} fontSize="11.5" fontWeight="600">In Webflow</text>
      {row(24, 78, '<a', true)}
      {row(36, 96, 'data-onelink="subscription"')}
      {row(36, 114, 'data-add-slug="true">')}
      {row(24, 132, 'Subscribe', true)}
      {row(24, 150, '</a>', true)}
      <text x={24} y={170} fill={c.muted} fontSize="9.5" fontStyle="italic">no URL typed in</text>

      <path d="M228,105 L268,105" {...line} />
      <Note c={c} x={248} y={92}>on load</Note>

      <rect x={272} y={30} width={216} height={150} rx="10" fill={c.bg} stroke={c.brand} strokeWidth="1.5" />
      <text x={284} y={52} fill={c.text} fontSize="11.5" fontWeight="600">The script's table</text>
      {row(284, 78, 'book         → …/eonrides')}
      {row(284, 96, 'download     → …/download_app')}
      {row(284, 114, 'subscription → …/subs', true)}
      {row(284, 132, 'partners     → …/partner')}
      <text x={284} y={170} fill={c.muted} fontSize="9.5" fontStyle="italic">one place to change a destination</text>

      <path d="M488,105 L528,105" {...line} />
      <Note c={c} x={508} y={92}>on tap</Note>

      <rect x={532} y={30} width={216} height={150} rx="10" fill={c.bg} stroke={c.border} />
      <text x={544} y={52} fill={c.text} fontSize="11.5" fontWeight="600">The link, as tapped</text>
      {row(544, 78, 'go.eonrides.com/nQbG/subs', true)}
      {row(544, 96, '+ campaign (af_channel, af_adset…)')}
      {row(544, 114, '+ click IDs, Mixpanel ID')}
      {row(544, 132, '+ promo code')}
      {row(544, 150, '+ screen to open')}
    </Figure>
  );
}

/* The JSON the app receives, landing on the screen and the promo popup. */
function DeepLinkPhone({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-dlv)" };
  return (
    <Figure c={c} viewBox="0 0 760 300" label="The deep_link_value JSON names a screen and a promo code; the app opens the Subscriptions screen and shows a popup with the code applied."
      caption="pathname is the screen the app opens. code is the promo popup on top of it.">
      <Arrow id="eon-fig-dlv" c={c} />
      <text x={30} y={60} fill={c.muted} fontSize="10" fontFamily={MONO}>deep_link_value</text>
      <text x={30} y={90} fill={c.text} fontSize="12.5" fontFamily={MONO}>{"{"}</text>
      <text x={48} y={114} fill={c.text} fontSize="12.5" fontFamily={MONO}>"pathname": "/subscriptions",</text>
      <text x={48} y={140} fill={c.text} fontSize="12.5" fontFamily={MONO}>"code": "EON99"</text>
      <text x={30} y={164} fill={c.text} fontSize="12.5" fontFamily={MONO}>{"}"}</text>
      <path d="M300,110 C 380,110 400,66 468,66" {...line} />
      <path d="M220,136 C 340,136 380,228 468,228" {...line} />
      <Note c={c} x={384} y={82}>opens this screen</Note>
      <Note c={c} x={384} y={194}>shows this popup</Note>

      <rect x={470} y={16} width={230} height={268} rx="26" fill={c.bg} stroke={c.border} strokeWidth="1.5" />
      <rect x={478} y={24} width={214} height={252} rx="20" fill={c.panel} />
      <rect x={555} y={30} width={60} height="6" rx="3" fill={c.border} />
      <text x={585} y={70} textAnchor="middle" fill={c.text} fontSize="13" fontWeight="650">Subscriptions</text>
      {[92, 120, 148].map((y, i) => (
        <g key={y}>
          <rect x={492} y={y} width={186} height="20" rx="6" fill={c.bg} />
          <rect x={500} y={y + 6} width={i === 1 ? 90 : 70} height="8" rx="4" fill={c.border} />
        </g>
      ))}
      <rect x={490} y={196} width={190} height={66} rx="12" fill={c.bg} stroke={c.brand} strokeWidth="1.2" />
      <text x={585} y={222} textAnchor="middle" fill={c.text} fontSize="11.5" fontWeight="600">Promo code applied</text>
      <text x={585} y={242} textAnchor="middle" fill={c.brand} fontSize="12" fontWeight="650" fontFamily={MONO}>EON99</text>
    </Figure>
  );
}

/* One Mixpanel ID, two routes, one person. */
function IdentityFlow({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-id)" };
  return (
    <Figure c={c} viewBox="0 0 760 210" label="The browser's Mixpanel ID travels as af_sub4 through OneLink to the app and as mp_id on internal links to the web app; both call mixpanel.identify with it."
      caption="Whichever way the person goes, the receiving side identifies them with the ID the site already had, so Mixpanel sees one person.">
      <Arrow id="eon-fig-id" c={c} />
      <Box c={c} x={16} y={74} w={200} h={62} title="Browser on the site" sub="Mixpanel ID f5bd1ba5-…" accent />
      <path d="M216,96 L300,96 L300,46 L468,46" {...line} />
      <path d="M216,114 L300,114 L300,164 L468,164" {...line} />
      <text x={384} y={38} textAnchor="middle" fill={c.muted} fontSize="9.5" fontFamily={MONO}>OneLink · af_sub4</text>
      <text x={384} y={156} textAnchor="middle" fill={c.muted} fontSize="9.5" fontFamily={MONO}>internal link · mp_id</text>
      <Box c={c} x={470} y={16} w={274} h={62} title="Eon app" sub="mixpanel.identify(af_sub4)" />
      <Box c={c} x={470} y={134} w={274} h={62} title="app.eonrides.com" sub="mixpanel.identify(mp_id)" />
    </Figure>
  );
}

/* The same values under AppsFlyer's names and the site's names. */
function NameTranslation({ c }) {
  const pairs = [
    ["utm_source", "af_channel"],
    ["utm_medium", "af_sub1"],
    ["utm_campaign", "af_adset"],
    ["utm_content", "af_ad"],
    ["utm_term", "af_sub2"],
    ["fbclid, gclid", "af_sub3  (packed, name:value|name:value)"],
    ["Mixpanel ID (mp_id)", "af_sub4"],
    ["code", "code, and inside deep_link_value"],
  ];
  const top = 58;
  const step = 24;
  return (
    <Figure c={c} viewBox="0 0 760 260" label="Each site parameter next to its AppsFlyer name: utm_source is af_channel, utm_medium is af_sub1, utm_campaign is af_adset, utm_content is af_ad, utm_term is af_sub2, click IDs are packed into af_sub3, the Mixpanel ID is af_sub4, and the code travels as code."
      caption="Same values, different names. The script renames them on the way out to OneLink and back again on the redirect pages.">
      <text x={40} y={32} fill={c.text} fontSize="11.5" fontWeight="600">On the site</text>
      <text x={720} y={32} textAnchor="end" fill={c.text} fontSize="11.5" fontWeight="600">In AppsFlyer</text>
      {pairs.map(([site, af], i) => {
        const y = top + i * step;
        return (
          <g key={site}>
            <text x={40} y={y} fill={c.text} fontSize="11" fontFamily={MONO}>{site}</text>
            <line x1={260} y1={y - 4} x2={400} y2={y - 4} stroke={c.border} strokeWidth="1" />
            <circle cx={260} cy={y - 4} r="2.5" fill={c.brand} />
            <circle cx={400} cy={y - 4} r="2.5" fill={c.brand} />
            <text x={412} y={y} fill={c.text} fontSize="11" fontFamily={MONO}>{af}</text>
          </g>
        );
      })}
      <text x={330} y={top + pairs.length * step + 4} textAnchor="middle" fill={c.muted} fontSize="9.5" fontStyle="italic">out: site → OneLink · back: redirect page → site</text>
    </Figure>
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
      <MemoryTimeline c={c} />
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
      <ButtonFlow c={c} />
      <Terminal title="Button in Webflow" lang="html" code={wa.buttonMarkup} />
      <DocTable c={c} head={["data-onelink", "Opens"]} mono={[0, 1]} rows={wa.onelinkKeys.map((row) => [row.key, row.url])} />
      <Prose c={c} text={wa.stampIntro} />
      <Terminal title="The link, as tapped" lang="url" code={wa.stampExample} />
      <Prose c={c} text={wa.stampNote} />
      <NameTranslation c={c} />
    </>
  );
}

function DeepLink({ c }) {
  return (
    <>
      <Prose c={c} text={wa.deepLinkIntro} />
      <DeepLinkPhone c={c} />
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
      <IdentityFlow c={c} />
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
      <Terminal title="Browser console" lang="console" code={wa.debug} />
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
