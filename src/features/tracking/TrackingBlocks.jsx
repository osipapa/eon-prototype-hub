import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
import { copyText } from "@/lib/uiState";
import { MIXPANEL_TRACKING_EXAMPLE, TRIP_REVIEW_PLAN } from "./trackingExample";
import { WEBSITE_ATTRIBUTION } from "./websiteAttribution";

/* Tracking reference blocks rendered inside Eon Design pages. Each block is
   keyed by the `tracking` field on a design section. */
export default function TrackingBlock({ block, c, onOpenPrompts }) {
  const Block = BLOCKS[block];
  return Block ? <Block c={c} onOpenPrompts={onOpenPrompts} /> : null;
}

const shadow = "var(--shadow-surface)";
const mp = MIXPANEL_TRACKING_EXAMPLE;
const plan = TRIP_REVIEW_PLAN;
const wa = WEBSITE_ATTRIBUTION;

/* ---------- Shared documentation primitives ---------- */

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

/* ---------- Mixpanel ---------- */

function MixpanelOverview({ c }) {
  return (
    <>
      <Prose c={c} text={mp.intro} />
      <p className="eon-doc-p" style={{ color: c.secondary }}>Setting up tracking for a feature goes in this order:</p>
      <Bullets c={c} items={mp.setupSteps.map((step) => `${step.title}. ${step.detail}`)} />
    </>
  );
}

/* A typed value drawn as a chip: number, boolean, string, or null. */
function TypeChip({ x, y, type, text }) {
  return (
    <g className={`ty-${type}`}>
      <rect x={x} y={y} width={chipW(text)} height="22" rx="7" fillOpacity=".16" />
      <text x={x + 9} y={y + 15} fontFamily={MONO} fontSize="10">{text}</text>
    </g>
  );
}

/* A star is tapped on the phone, Trip Reviewed is sent with four typed
   properties, Mixpanel receives it. */
function TapToEvent({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-tap)" };
  const star = (cx, cy, filled) => {
    const pts = [];
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? 9 : 4;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
    return <polygon key={cx} points={pts.join(" ")} fill={filled ? c.brand : "none"} stroke={filled ? c.brand : c.muted} strokeWidth="1.2" />;
  };
  const props = [["number", "Rating: 4"], ["boolean", "Is Update: false"], ["string", "Car ID: \"car_8f3a…\""], ["string", "Owner ID: \"adm_2c1d…\""]];
  return (
    <Figure c={c} viewBox="0 0 760 300" label="On the Trip Summary screen the person taps the fourth star of the Rate Your Trip card. The app sends a Trip Reviewed event with Rating 4 as a number, Is Update false as a boolean, and Car ID and Owner ID as strings. Mixpanel receives it."
      caption="One tap, one event, four typed properties. Numbers, booleans, and strings each look different in a report, so the type is part of the contract.">
      <Arrow id="eon-fig-tap" c={c} />
      {/* phone */}
      <rect x={30} y={16} width={200} height={268} rx="24" fill={c.bg} stroke={c.border} strokeWidth="1.5" />
      <rect x={38} y={24} width={184} height={252} rx="18" fill={c.panel} />
      <rect x={104} y={30} width={52} height="6" rx="3" fill={c.border} />
      <text x={130} y={64} textAnchor="middle" fill={c.text} fontSize="11.5" fontWeight="650">Trip Summary</text>
      <rect x={50} y={80} width={160} height={110} rx="12" fill={c.bg} stroke={c.border} />
      <text x={130} y={104} textAnchor="middle" fill={c.text} fontSize="11" fontWeight="600">Rate your trip</text>
      {[0, 1, 2, 3, 4].map((i) => star(78 + i * 26, 130, i < 4))}
      <circle cx={156} cy={130} r="15" fill="none" stroke={c.brand} strokeWidth="1.2" strokeDasharray="3 2" />
      <rect x={66} y={156} width={128} height={20} rx="7" fill={c.panel} stroke={c.border} />
      <text x={130} y={170} textAnchor="middle" fill={c.muted} fontSize="9">Add details</text>
      <text x={130} y={216} textAnchor="middle" fill={c.muted} fontSize="9.5" fontStyle="italic">the fourth star is tapped</text>

      <path d="M232,130 L290,130" {...line} />
      <text x={261} y={118} textAnchor="middle" fill={c.muted} fontSize="9.5" fontStyle="italic">fires</text>

      {/* event */}
      <rect x={294} y={40} width={272} height={200} rx="12" fill={c.bg} stroke={c.brand} strokeWidth="1.5" />
      <text x={310} y={66} fill={c.muted} fontSize="9.5">event</text>
      <text x={310} y={86} fill={c.text} fontSize="13" fontWeight="650">Trip Reviewed</text>
      <text x={310} y={112} fill={c.muted} fontSize="9.5">properties</text>
      {props.map(([type, text], i) => <TypeChip key={text} x={310} y={122 + i * 28} type={type} text={text} />)}

      <path d="M568,130 L626,130" {...line} />
      <text x={597} y={118} textAnchor="middle" fill={c.muted} fontSize="9.5" fontStyle="italic">to</text>

      {/* mixpanel */}
      <rect x={630} y={92} width={116} height={76} rx="12" fill={c.bg} stroke={c.border} />
      <text x={688} y={124} textAnchor="middle" fill={c.text} fontSize="12" fontWeight="650">Mixpanel</text>
      <text x={688} y={142} textAnchor="middle" fill={c.muted} fontSize="9.5">Live View, then reports</text>

      {/* type legend */}
      {[["number", "number"], ["boolean", "boolean"], ["string", "string"], ["null", "null, when skipped"]].map(([type, label], i) => (
        <g key={type} transform={`translate(${310 + i * 108} 270)`} className={`ty-${type}`}>
          <circle cx="4" cy="-3" r="3.5" />
          <text x="12" y="0" fill={c.muted} fontSize="9.5">{label}</text>
        </g>
      ))}
    </Figure>
  );
}

function MixpanelTap({ c }) {
  return (
    <>
      <Prose c={c} text={plan.intro} />
      <TapToEvent c={c} />
      <Terminal title="Trip Reviewed, as sent" lang="json" code={plan.tapPayload} />
    </>
  );
}

function MixpanelFormat({ c }) {
  return (
    <>
      <Prose c={c} text={plan.formatIntro} />
      <DocTable c={c} head={["", "How we do it"]} rows={plan.format.map((row) => [row.rule, row.how])} />
    </>
  );
}

/* The three events across the review flow, and what gates each. */
function ReviewFlow({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-flow)" };
  const stops = [
    { x: 12, screen: "Trip Summary", action: "the card is on screen", event: "Page Viewed", note: "already exists" },
    { x: 200, screen: "Rate your trip", action: "a star is tapped", event: "Trip Reviewed", note: "always, even if nothing else" },
    { x: 388, screen: "Details form", action: "Submit & Claim Eon Credit", event: "Trip Review Details Added", note: "only if a question was answered" },
    { x: 576, screen: "App Store ask", action: "the prompt appears", event: "App Store Review Requested", note: "4 or 5 stars, support not unresolved" },
  ];
  return (
    <Figure c={c} viewBox="0 0 760 190" label="The review flow: Page Viewed when the Trip Summary screen shows the card, Trip Reviewed when a star is tapped, Trip Review Details Added when the details form is submitted with at least one answer, App Store Review Requested when the prompt appears, which only happens for 4 or 5 stars and when support was not left unresolved."
      caption="Each event has one moment it fires and one condition that can stop it. Car ID and Owner ID ride along on every event from the star tap onwards.">
      <Arrow id="eon-fig-flow" c={c} />
      {stops.map((stop, i) => (
        <g key={stop.event}>
          <rect x={stop.x} y={20} width={172} height={64} rx="10" fill={c.bg} stroke={c.border} />
          <text x={stop.x + 12} y={42} fill={c.text} fontSize="11" fontWeight="600">{stop.screen}</text>
          <text x={stop.x + 12} y={60} fill={c.muted} fontSize="9.5" fontStyle="italic">{stop.action}</text>
          <path d={`M${stop.x + 86},84 L${stop.x + 86},110`} {...line} />
          <rect x={stop.x} y={112} width={172} height={58} rx="10" fill={c.bg} stroke={c.brand} strokeWidth="1.2" />
          <text x={stop.x + 12} y={134} fill={c.text} fontSize="10.5" fontWeight="650">{stop.event}</text>
          <text x={stop.x + 12} y={152} fill={c.muted} fontSize="9" fontStyle="italic">{stop.note}</text>
          {i < stops.length - 1 && <path d={`M${stop.x + 172},52 L${stop.x + 186},52`} {...line} />}
        </g>
      ))}
    </Figure>
  );
}

function MixpanelPlan({ c }) {
  return (
    <>
      <ReviewFlow c={c} />
      {plan.events.map((event) => (
        <div key={event.name} className="eon-doc-event">
          <h3 className="eon-doc-h3" style={{ color: c.text }}>{event.name}{event.supporting && <span style={{ color: c.muted }}> · supporting</span>}</h3>
          <Prose c={c} text={event.when} />
          <Terminal title={`${event.name}, as sent`} lang="json" code={event.payload} />
          <DocTable
            c={c}
            head={["Property", "Type", "Values", "Notes"]}
            mono={[0]}
            rows={event.properties.map((property) => [property.name, <span key="t" className={`eon-doc-type is-${property.type}`}>{property.type}</span>, property.values, property.notes])}
          />
        </div>
      ))}
    </>
  );
}

function MixpanelRules({ c }) {
  return (
    <>
      <Bullets c={c} items={mp.guardrails} />
      <p className="eon-doc-p" style={{ color: c.secondary }}>{mp.checkIntro}</p>
      <Bullets c={c} items={mp.qa} />
    </>
  );
}

function MixpanelPrompt({ c, onOpenPrompts }) {
  return (
    <>
      <Prose c={c} text={mp.promptIntro} />
      <Terminal title="Mixpanel tracking plan" lang="text" code={mp.setupPrompt} />
      <button className="eon-buttonish eon-doc-link" type="button" onClick={onOpenPrompts} style={{ color: c.text, borderColor: c.border }}>
        <FileText size={14} aria-hidden="true" />
        Open in the Prompt Library
      </button>
    </>
  );
}

/* ---------- Websites: attribution & routing ---------- */

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
    [/\b(?:null|true|false)\b/, "keyword"],
    [/\b\d+(?:\.\d+)?\b/, "number"],
    [/[{}[\]:,]/, "punct"],
  ],
  js: [
    [COMMENT, "comment"],
    [/"[^"]*"(?=\s*:)/, "key"],
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

/* One example link followed all the way through. Every parameter keeps its
   colour (CSS classes fl-*) so a reader can see where utm_source ends up as
   af_channel and back again. */
const FLOW_KEYS = [
  ["source", "utm_source"], ["medium", "utm_medium"], ["campaign", "utm_campaign"], ["content", "utm_content"],
  ["click", "click ID"], ["code", "promo code"], ["mp", "Mixpanel ID"], ["page", "page tag"], ["screen", "app screen"],
];

function Line({ c, x, y, size = 10.5, parts }) {
  return (
    <text x={x} y={y} fontFamily={MONO} fontSize={size}>
      {parts.map((part, i) => (typeof part === "string"
        ? <tspan key={i} fill={c.secondary}>{part}</tspan>
        : <tspan key={i} className={`fl-${part[0]}`}>{part[1]}</tspan>))}
    </text>
  );
}

function Panel({ c, x, y, w, h, title, accent }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={c.bg} stroke={accent ? c.brand : c.border} strokeWidth={accent ? 1.5 : 1} />
      <text x={x + 14} y={y + 20} fill={c.text} fontSize="11.5" fontWeight="600">{title}</text>
    </>
  );
}

/* Values drawn as chips: a coloured pill per parameter, readable at a
   glance, laid out left to right. */
const CH = 6.05; // px per character at 10px mono
const chipW = (text) => Math.round(text.length * CH + 18);
function Chip({ x, y, k, text }) {
  return (
    <g className={`fl-${k}`}>
      <rect x={x} y={y} width={chipW(text)} height="22" rx="7" fillOpacity=".16" />
      <text x={x + 9} y={y + 15} fontFamily={MONO} fontSize="10">{text}</text>
    </g>
  );
}
function ChipRow({ x, y, chips, gap = 6 }) {
  let cursor = x;
  return chips.map(([k, text]) => {
    const cx = cursor;
    cursor += chipW(text) + gap;
    return <Chip key={text} x={cx} y={y} k={k} text={text} />;
  });
}
function StepTitle({ c, x = 18, y = 24, children }) {
  return <text x={x} y={y} fill={c.text} fontSize="12" fontWeight="600">{children}</text>;
}

const AD_CHIPS = [["code", "code=EON99"], ["source", "utm_source=meta"], ["medium", "utm_medium=paid"], ["campaign", "utm_campaign=subs_sept"], ["content", "utm_content=video_a"], ["click", "fbclid=IwAR…"]];

function StepAdLink({ c }) {
  return (
    <Figure c={c} viewBox="0 0 760 118" label="The ad link: the page electric-car-subscription with a promo code, four UTM parameters, and the fbclid the ad network added.">
      <StepTitle c={c}>1 · Someone taps the ad</StepTitle>
      <text x={18} y={58} fill={c.secondary} fontSize="10.5" fontFamily={MONO}>https://www.eonrides.com/</text>
      <Chip x={172} y={42} k="page" text="electric-car-subscription" />
      <ChipRow x={18} y={78} chips={AD_CHIPS} />
    </Figure>
  );
}

function StepRemember({ c }) {
  return (
    <Figure c={c} viewBox="0 0 760 150" label="What the site keeps: the campaign parameters and click ID for 30 days, the promo code until a newer one, plus the page tag and Mixpanel ID the page adds itself.">
      <StepTitle c={c}>2 · The site remembers it</StepTitle>
      <text x={18} y={58} fill={c.muted} fontSize="10">kept for 30 days</text>
      <ChipRow x={150} y={43} chips={AD_CHIPS.slice(1)} />
      <text x={18} y={92} fill={c.muted} fontSize="10">until a newer one</text>
      <ChipRow x={150} y={77} chips={[["code", "code=EON99"]]} />
      <text x={18} y={126} fill={c.muted} fontSize="10">the page adds</text>
      <ChipRow x={150} y={111} chips={[["page", "c=electric-car-subscription"], ["mp", "mp_id=f5bd1ba5-…"]]} />
      <text x={470} y={126} fill={c.muted} fontSize="9.5" fontStyle="italic">the Mixpanel ID comes from the SDK on the page</text>
    </Figure>
  );
}

function StepRename({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-rename)" };
  const rows = [
    [["source", "utm_source=meta"], ["source", "af_channel=meta"], ""],
    [["medium", "utm_medium=paid"], ["medium", "af_sub1=paid"], ""],
    [["campaign", "utm_campaign=subs_sept"], ["campaign", "af_adset=subs_sept"], ""],
    [["content", "utm_content=video_a"], ["content", "af_ad=video_a"], ""],
    [["click", "fbclid=IwAR…"], ["click", "af_sub3=fbclid:IwAR…"], "several click IDs are packed into one slot"],
    [["mp", "mp_id=f5bd1ba5-…"], ["mp", "af_sub4=f5bd1ba5-…"], "AppsFlyer has no Mixpanel slot, so it rides in a spare one"],
    [["code", "code=EON99"], ["code", "code=EON99"], "kept as is for the web app"],
    [["code", "code=EON99"], ["code", "deep_link_value.code=EON99"], "and inside the app's JSON, for the promo popup"],
    [["page", "c=electric-car-subscription"], ["page", "c=electric-car-subscription"], "which page the button was on"],
    [["screen", "DLV_PATHNAME[subscription]"], ["screen", "deep_link_value.pathname=/subscriptions"], "the screen, from the script's table"],
  ];
  const top = 56;
  const step = 29;
  return (
    <Figure c={c} viewBox={`0 0 760 ${top + rows.length * step + 8}`} label="On tap, each value is renamed to AppsFlyer's parameter: utm_source becomes af_channel, utm_medium af_sub1, utm_campaign af_adset, utm_content af_ad, click IDs are packed into af_sub3, the Mixpanel ID goes into af_sub4, the code is sent both flat and inside deep_link_value, and the screen to open comes from the script's table.">
      <Arrow id="eon-fig-rename" c={c} />
      <StepTitle c={c}>3 · On tap, each value gets the name AppsFlyer expects</StepTitle>
      <text x={18} y={44} fill={c.muted} fontSize="9.5" fontStyle="italic">on the site</text>
      <text x={290} y={44} fill={c.muted} fontSize="9.5" fontStyle="italic">on the OneLink</text>
      {rows.map(([left, right, note], i) => {
        const y = top + i * step;
        return (
          <g key={i}>
            <Chip x={18} y={y} k={left[0]} text={left[1]} />
            <path d={`M${18 + chipW(left[1]) + 10},${y + 11} L282,${y + 11}`} {...line} />
            <Chip x={290} y={y} k={right[0]} text={right[1]} />
            {note && <text x={290 + chipW(right[1]) + 12} y={y + 15} fill={c.muted} fontSize="9.5" fontStyle="italic">{note}</text>}
          </g>
        );
      })}
    </Figure>
  );
}

function StepDestinations({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-dest)" };
  return (
    <Figure c={c} viewBox="0 0 760 232" label="AppsFlyer OneLink records the click and opens the app when it is installed; otherwise, on a phone or on desktop, it sends the person to app.eonrides.com.">
      <Arrow id="eon-fig-dest" c={c} />
      <StepTitle c={c}>4 · AppsFlyer records the click and picks the destination</StepTitle>
      <Box c={c} x={230} y={44} w={300} h={54} title="go.eonrides.com/nQbG/subs" sub="the link, with everything from step 3 on it" accent />
      <path d="M330,98 L330,130 L200,130 L200,160" {...line} />
      <path d="M430,98 L430,130 L560,130 L560,160" {...line} />
      <text x={200} y={150} textAnchor="middle" fill={c.muted} fontSize="9.5" fontStyle="italic">the app is installed</text>
      <text x={560} y={150} textAnchor="middle" fill={c.muted} fontSize="9.5" fontStyle="italic">it is not, on a phone or on desktop</text>
      <Box c={c} x={80} y={162} w={240} h={54} title="Eon app" sub="opens the screen, shows the code" />
      <Box c={c} x={440} y={162} w={240} h={54} title="app.eonrides.com" sub="the web app, see step 5" />
    </Figure>
  );
}

function StepReturn({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-return)" };
  const fills = [
    [["source", "utm_source={af_channel}"], ["source", "utm_source=meta"]],
    [["campaign", "utm_campaign={af_adset}"], ["campaign", "utm_campaign=subs_sept"]],
    [["medium", "utm_medium={af_sub1}"], ["medium", "utm_medium=paid"]],
    [["content", "utm_content={af_ad}"], ["content", "utm_content=video_a"]],
    [["click", "af_sub3={af_sub3}"], ["click", "af_sub3=fbclid:IwAR…"]],
  ];
  const reads = [
    [["code", "code=EON99"], "applies the promo"],
    [["mp", "af_sub4=f5bd1ba5-…"], "mixpanel.identify, the same person as on the site"],
    [["source", "utm_source=meta"], "its own analytics, with the other utm_ values"],
    [["page", "c=electric-car-subscription"], "which page the person converted from"],
  ];
  const top = 78;
  const step = 29;
  const top2 = top + fills.length * step + 44;
  return (
    <Figure c={c} viewBox={`0 0 760 ${top2 + reads.length * step + 8}`} label="When the app is not installed, AppsFlyer sends the person to app.eonrides.com through a redirect URL whose macros turn af_channel back into utm_source and so on, and appends the rest of the link. The web app applies the code, identifies the Mixpanel user from af_sub4, and keeps the UTMs and page tag.">
      <Arrow id="eon-fig-return" c={c} />
      <StepTitle c={c}>5 · At the web app, the names come back</StepTitle>
      <text x={18} y={44} fill={c.secondary} fontSize="10.5">AppsFlyer sends anyone without the app to this URL, filling each {"{macro}"} from the link:</text>
      <text x={18} y={66} fill={c.muted} fontSize="9.5" fontStyle="italic">configured in AppsFlyer</text>
      <text x={330} y={66} fill={c.muted} fontSize="9.5" fontStyle="italic">what app.eonrides.com receives</text>
      {fills.map(([left, right], i) => {
        const y = top + i * step;
        return (
          <g key={i}>
            <Chip x={18} y={y} k={left[0]} text={left[1]} />
            <path d={`M${18 + chipW(left[1]) + 10},${y + 11} L322,${y + 11}`} {...line} />
            <Chip x={330} y={y} k={right[0]} text={right[1]} />
          </g>
        );
      })}
      <text x={18} y={top + fills.length * step + 10} fill={c.muted} fontSize="9.5" fontStyle="italic">AppsFlyer also appends everything else that was on the link: c, af_sub4, code, deep_link_value</text>
      <text x={18} y={top2 - 12} fill={c.secondary} fontSize="10.5">The web app reads them from the query string:</text>
      {reads.map(([chip, what], i) => {
        const y = top2 + i * step;
        return (
          <g key={i}>
            <Chip x={18} y={y} k={chip[0]} text={chip[1]} />
            <text x={18 + chipW(chip[1]) + 12} y={y + 15} fill={c.secondary} fontSize="10">{what}</text>
          </g>
        );
      })}
    </Figure>
  );
}

function StepOutcome({ c }) {
  const cols = [
    { x: 12, title: "Eon app", sub: "when it is installed", chips: [["screen", "/subscriptions"], ["code", "EON99"], ["mp", "f5bd1ba5-…"], ["source", "meta"]], reads: ["opens the screen", "shows the promo popup", "mixpanel.identify", "install attributed to the ad"] },
    { x: 262, title: "app.eonrides.com", sub: "when it is not", chips: [["code", "EON99"], ["source", "meta"], ["campaign", "subs_sept"], ["mp", "f5bd1ba5-…"]], reads: ["applies the promo", "its own analytics", "", "mixpanel.identify"] },
    { x: 512, title: "AppsFlyer", sub: "the click record", chips: [["source", "meta"], ["campaign", "subs_sept"], ["content", "video_a"], ["page", "electric-car-…"]], reads: ["which channel", "which ad set", "which creative", "which page converted"] },
  ];
  return (
    <Figure c={c} viewBox="0 0 760 236" label="What each side ends up with: the app opens the Subscriptions screen with the EON99 popup and identifies the Mixpanel user; the web app applies the promo, keeps the UTMs, and identifies the same user; AppsFlyer holds the channel, ad set, creative, and the page that converted.">
      <StepTitle c={c}>6 · What each side ends up with</StepTitle>
      {cols.map((col) => (
        <g key={col.title}>
          <rect x={col.x} y={40} width={236} height={186} rx="10" fill={c.bg} stroke={c.border} />
          <text x={col.x + 14} y={62} fill={c.text} fontSize="11.5" fontWeight="600">{col.title}</text>
          <text x={col.x + 14} y={78} fill={c.muted} fontSize="9.5" fontStyle="italic">{col.sub}</text>
          {col.chips.map(([k, text], i) => (
            <g key={text}>
              <Chip x={col.x + 14} y={92 + i * 30} k={k} text={text} />
              <text x={col.x + 14 + chipW(text) + 10} y={92 + i * 30 + 15} fill={c.secondary} fontSize="9.5">{col.reads[i]}</text>
            </g>
          ))}
        </g>
      ))}
    </Figure>
  );
}

/* The system map, as a storyboard: six small figures, one idea each. */
function SystemMap({ c }) {
  const steps = [
    ["Every campaign link is a normal page URL with the campaign parameters, the promo code, and whatever click ID the ad network adds.", StepAdLink],
    ["The first tagged visit is saved in the browser. The campaign and click ID stay for 30 days; the promo code is replaced by the next one the person uses.", StepRemember],
    ["AppsFlyer has its own names for these slots. When a OneLink button is tapped, the script writes every value onto the link under AppsFlyer's name.", StepRename],
    ["AppsFlyer records the click with all of it and decides where the person goes: the app if it is installed, the web app if not. The script never has to know the device.", StepDestinations],
    ["Anyone without the app lands on app.eonrides.com. AppsFlyer has already turned the names back, and the web app reads the rest.", StepReturn],
    ["Whichever way the person went, the same values arrive. Same colours, same meaning, different names on the way.", StepOutcome],
  ];
  return steps.map(([text, Step]) => (
    <div key={text} className="eon-doc-step">
      <p className="eon-doc-p" style={{ color: c.secondary }}>{text}</p>
      <Step c={c} />
    </div>
  ));
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
      {row(544, 96, '+ campaign, as af_channel…')}
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
      <text x={40} y={104} fill={c.muted} fontSize="10" fontFamily={MONO}>deep_link_value</text>
      <text x={40} y={132} fill={c.text} fontSize="12.5" fontFamily={MONO}>{"{"}</text>
      <text x={58} y={156} fill={c.text} fontSize="12.5" fontFamily={MONO}>"pathname": "/subscriptions",</text>
      <text x={58} y={180} fill={c.text} fontSize="12.5" fontFamily={MONO}>"code": "EON99"</text>
      <text x={40} y={204} fill={c.text} fontSize="12.5" fontFamily={MONO}>{"}"}</text>
      <path d="M300,152 C 380,152 390,66 468,66" {...line} />
      <path d="M190,176 C 300,176 380,228 468,228" {...line} />
      <Note c={c} x={458} y={54} anchor="end">opens this screen</Note>
      <Note c={c} x={458} y={248} anchor="end">shows this popup</Note>

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
    <Figure c={c} viewBox="0 0 760 210" label="The browser's Mixpanel ID travels as af_sub4 through OneLink to the app or the web app, and as mp_id on internal links to the web app; the receiving side calls mixpanel.identify with it."
      caption="Whichever way the person goes, the receiving side identifies them with the ID the site already had, so Mixpanel sees one person.">
      <Arrow id="eon-fig-id" c={c} />
      <Box c={c} x={16} y={74} w={200} h={62} title="Browser on the site" sub="Mixpanel ID f5bd1ba5-…" accent />
      <path d="M216,96 L300,96 L300,46 L468,46" {...line} />
      <path d="M216,114 L300,114 L300,164 L468,164" {...line} />
      <text x={384} y={38} textAnchor="middle" fill={c.muted} fontSize="9.5" fontFamily={MONO}>OneLink · af_sub4</text>
      <text x={384} y={156} textAnchor="middle" fill={c.muted} fontSize="9.5" fontFamily={MONO}>internal link · mp_id</text>
      <Box c={c} x={470} y={16} w={274} h={62} title="Eon app, or app.eonrides.com through OneLink" sub="mixpanel.identify(af_sub4)" />
      <Box c={c} x={470} y={134} w={274} h={62} title="app.eonrides.com, through a link on the site" sub="mixpanel.identify(mp_id)" />
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
      <DocTable c={c} head={["AppsFlyer's name", "Ours"]} mono={[0, 1]} rows={wa.normalize.map((row) => [row.from, row.to])} />
      <Prose c={c} text={wa.normalizeNote} />
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
  "mixpanel-overview": MixpanelOverview,
  "mixpanel-tap": MixpanelTap,
  "mixpanel-format": MixpanelFormat,
  "mixpanel-plan": MixpanelPlan,
  "mixpanel-rules": MixpanelRules,
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
