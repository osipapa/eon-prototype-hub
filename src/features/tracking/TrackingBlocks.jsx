import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
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

/* From the person's action to a chart: three places, one event. */
function MixpanelFlow({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-mp)" };
  const row = (x, y, text, bold) => <text key={`${x}-${y}`} x={x} y={y} fill={bold ? c.text : c.secondary} fontSize="10" fontFamily={MONO}>{text}</text>;
  return (
    <Figure c={c} viewBox="0 0 760 210" label="A completed action in the app calls one shared analytics module, which sends a named event with typed properties to Mixpanel, where it appears in Live View and then in reports."
      caption="Every surface calls the same module, so an event has one name and one shape wherever it is sent from.">
      <Arrow id="eon-fig-mp" c={c} />
      <rect x={12} y={30} width={216} height={150} rx="10" fill={c.bg} stroke={c.border} />
      <text x={24} y={52} fill={c.text} fontSize="11.5" fontWeight="600">In the product</text>
      <text x={24} y={78} fill={c.secondary} fontSize="10.5">The person finishes an action:</text>
      <text x={24} y={96} fill={c.text} fontSize="10.5" fontWeight="600">the carousel scroll completes,</text>
      <text x={24} y={112} fill={c.text} fontSize="10.5" fontWeight="600">the booking is confirmed.</text>
      <text x={24} y={140} fill={c.muted} fontSize="9.5" fontStyle="italic">a result, not a tap</text>

      <path d="M228,105 L268,105" {...line} />

      <rect x={272} y={30} width={216} height={150} rx="10" fill={c.bg} stroke={c.brand} strokeWidth="1.5" />
      <text x={284} y={52} fill={c.text} fontSize="11.5" fontWeight="600">Shared analytics module</text>
      {row(284, 78, "track(")}
      {row(296, 96, "FeatureActionCompleted,", true)}
      {row(296, 114, "{ featureName, action,")}
      {row(296, 132, "  surface, result }")}
      {row(284, 150, ")")}
      <text x={284} y={170} fill={c.muted} fontSize="9.5" fontStyle="italic">names and property builders live here</text>

      <path d="M488,105 L528,105" {...line} />

      <rect x={532} y={30} width={216} height={150} rx="10" fill={c.bg} stroke={c.border} />
      <text x={544} y={52} fill={c.text} fontSize="11.5" fontWeight="600">Mixpanel</text>
      <text x={544} y={78} fill={c.secondary} fontSize="10.5">Live View shows the payload</text>
      <text x={544} y={94} fill={c.secondary} fontSize="10.5">as it arrives, property by property.</text>
      <text x={544} y={120} fill={c.secondary} fontSize="10.5">Once it is verified in production,</text>
      <text x={544} y={136} fill={c.secondary} fontSize="10.5">it goes into reports and funnels.</text>
      <text x={544} y={164} fill={c.muted} fontSize="9.5" fontStyle="italic">check before you chart</text>
    </Figure>
  );
}

function MixpanelEvent({ c }) {
  const event = mp.eventExample;
  return (
    <>
      <Prose c={c} text={[event.trigger, event.note]} />
      <Terminal title="Event, as sent" lang="js" code={mp.eventCode} />
      <DocTable
        c={c}
        head={["Property", "Type", "Allowed values"]}
        mono={[0]}
        rows={event.properties.map((property) => [property.name, `${property.type}${property.required ? ", required" : ", optional"}`, property.values])}
      />
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

function SystemMap({ c }) {
  const line = { stroke: c.muted, strokeWidth: 1.1, fill: "none", markerEnd: "url(#eon-fig-map)" };
  const small = (x, y, text, anchor = "start") => <text x={x} y={y} textAnchor={anchor} fill={c.muted} fontSize="9.5" fontStyle="italic">{text}</text>;
  const col = [12, 262, 512];
  const colW = 236;
  return (
    <Figure c={c} viewBox="0 0 760 1086" label="One example ad link followed through the whole chain: the page saves the campaign details, the Subscribe button is rebuilt as a OneLink with AppsFlyer's parameter names, OneLink records the click and sends the person to the app, the redirect page, or the web app, and each destination reads the same values back under its own names."
      caption="One visit, followed all the way. Each colour is one value: it changes name on the way through AppsFlyer, never meaning.">
      <Arrow id="eon-fig-map" c={c} />

      {/* legend */}
      {FLOW_KEYS.map(([key, label], i) => (
        <g key={key} transform={`translate(${14 + i * 82} 14)`}>
          <circle cx="4" cy="-3" r="3.5" className={`fl-${key}`} />
          <text x="12" y="0" fill={c.muted} fontSize="9">{label}</text>
        </g>
      ))}

      {/* 1. the ad link */}
      <Panel c={c} x={12} y={30} w={736} h={64} title="The ad link, as someone taps it" />
      <Line c={c} x={26} y={66} parts={["https://www.eonrides.com/", ["page", "electric-car-subscription"]]} />
      <Line c={c} x={26} y={82} parts={["?", ["code", "code=EON99"], " &", ["source", "utm_source=meta"], " &", ["medium", "utm_medium=paid"], " &", ["campaign", "utm_campaign=subs_sept"], " &", ["content", "utm_content=video_a"], " &", ["click", "fbclid=IwAR…"]]} />

      <path d="M380,94 L380,118" {...line} />

      {/* 2. the page */}
      <Panel c={c} x={12} y={120} w={736} h={112} title="www.eonrides.com · the script reads the link" accent />
      {small(26, 160, "saved for 30 days")}
      <Line c={c} x={150} y={160} parts={[["source", "utm_source=meta"], "  ", ["medium", "utm_medium=paid"], "  ", ["campaign", "utm_campaign=subs_sept"], "  ", ["content", "utm_content=video_a"], "  ", ["click", "fbclid=IwAR…"]]} />
      {small(26, 180, "kept until a newer one")}
      <Line c={c} x={150} y={180} parts={[["code", "code=EON99"]]} />
      {small(26, 200, "added by the page")}
      <Line c={c} x={150} y={200} parts={[["page", "c=electric-car-subscription"], "   ", ["mp", "mp_id=f5bd1ba5-…"], "  (from the Mixpanel SDK)"]} />
      {small(26, 220, "and every Subscribe button on the page is rebuilt as the link below, on tap")}

      <path d="M380,232 L380,256" {...line} />

      {/* 3. the OneLink */}
      <Panel c={c} x={12} y={258} w={736} h={96} title="go.eonrides.com/nQbG/subs · the OneLink, with AppsFlyer's names for the same values" />
      <Line c={c} x={26} y={296} parts={["?", ["source", "af_channel=meta"], " &", ["medium", "af_sub1=paid"], " &", ["campaign", "af_adset=subs_sept"], " &", ["content", "af_ad=video_a"], " &", ["click", "af_sub3=fbclid:IwAR…"]]} />
      <Line c={c} x={26} y={312} parts={["&", ["mp", "af_sub4=f5bd1ba5-…"], " &", ["code", "code=EON99"], " &", ["page", "c=electric-car-subscription"]]} />
      <Line c={c} x={26} y={328} parts={["&deep_link_value={", ["screen", "\"pathname\":\"/subscriptions\""], ",", ["code", "\"code\":\"EON99\""], "}"]} />
      {small(26, 346, "utm_source → af_channel, utm_medium → af_sub1, utm_campaign → af_adset, utm_content → af_ad, click IDs packed into af_sub3, Mixpanel ID in af_sub4")}

      <path d="M380,354 L380,378" {...line} />

      {/* 4. AppsFlyer */}
      <Panel c={c} x={162} y={380} w={436} h={48} title="AppsFlyer OneLink records the click with everything above" />
      {small(176, 418, "then sends the person on, depending on the device")}

      <path d="M262,428 L262,452 L130,452 L130,478" {...line} />
      <path d="M380,428 L380,478" {...line} />
      <path d="M498,428 L498,452 L630,452 L630,478" {...line} />
      {small(130, 470, "phone, app installed", "middle")}
      {small(380, 470, "phone, no app", "middle")}
      {small(630, 470, "desktop", "middle")}

      {/* 5a. app */}
      <Panel c={c} x={col[0]} y={480} w={colW} h={240} title="Eon app" />
      {small(col[0] + 14, 516, "receives, through AppsFlyer")}
      <Line c={c} x={col[0] + 14} y={534} size={9.5} parts={["deep_link_value → opens ", ["screen", "/subscriptions"]]} />
      <Line c={c} x={col[0] + 14} y={550} size={9.5} parts={["                  and shows ", ["code", "EON99"]]} />
      <Line c={c} x={col[0] + 14} y={572} size={9.5} parts={[["source", "af_channel"], " ", ["medium", "af_sub1"], " ", ["campaign", "af_adset"]]} />
      <Line c={c} x={col[0] + 14} y={588} size={9.5} parts={[["content", "af_ad"], " ", ["click", "af_sub3"]]} />
      {small(col[0] + 14, 604, "→ the install or open is attributed to the Meta ad")}
      <Line c={c} x={col[0] + 14} y={626} size={9.5} parts={[["mp", "af_sub4"], " → mixpanel.identify(…)"]} />
      {small(col[0] + 14, 642, "→ the same person as on the site")}

      {/* 5b. redirect page */}
      <Panel c={c} x={col[1]} y={480} w={colW} h={240} title="/app-redirect-ios or -android" />
      {small(col[1] + 14, 516, "AppsFlyer rebuilds the link with utm_ names")}
      <Line c={c} x={col[1] + 14} y={534} size={9.5} parts={[["source", "utm_source=meta"]]} />
      <Line c={c} x={col[1] + 14} y={550} size={9.5} parts={[["medium", "utm_medium=paid"]]} />
      <Line c={c} x={col[1] + 14} y={566} size={9.5} parts={[["campaign", "utm_campaign=subs_sept"]]} />
      <Line c={c} x={col[1] + 14} y={582} size={9.5} parts={[["content", "utm_content=video_a"]]} />
      <Line c={c} x={col[1] + 14} y={598} size={9.5} parts={[["click", "af_sub3=fbclid:IwAR…"]]} />
      <Line c={c} x={col[1] + 14} y={614} size={9.5} parts={[["mp", "af_sub4=f5bd1ba5-…"]]} />
      <Line c={c} x={col[1] + 14} y={630} size={9.5} parts={["deep_link_value={…", ["code", "\"code\":\"EON99\""], "}"]} />
      {small(col[1] + 14, 652, "the script unpacks what is still packed")}
      <Line c={c} x={col[1] + 14} y={670} size={9.5} parts={[["click", "af_sub3"], " → ", ["click", "fbclid=IwAR…"]]} />
      <Line c={c} x={col[1] + 14} y={686} size={9.5} parts={[["mp", "af_sub4"], " → ", ["mp", "mp_id"]]} />
      <Line c={c} x={col[1] + 14} y={702} size={9.5} parts={["deep_link_value → ", ["code", "code=EON99"]]} />

      {/* 5c. web app on desktop */}
      <Panel c={c} x={col[2]} y={480} w={colW} h={240} title="app.eonrides.com" />
      {small(col[2] + 14, 516, "AppsFlyer sends the person here with")}
      <Line c={c} x={col[2] + 14} y={534} size={9.5} parts={[["source", "utm_source=meta"]]} />
      <Line c={c} x={col[2] + 14} y={550} size={9.5} parts={[["medium", "utm_medium=paid"]]} />
      <Line c={c} x={col[2] + 14} y={566} size={9.5} parts={[["campaign", "utm_campaign=subs_sept"]]} />
      <Line c={c} x={col[2] + 14} y={582} size={9.5} parts={[["content", "utm_content=video_a"]]} />
      <Line c={c} x={col[2] + 14} y={598} size={9.5} parts={[["code", "code=EON99"]]} />
      <Line c={c} x={col[2] + 14} y={614} size={9.5} parts={[["page", "c=electric-car-subscription"]]} />
      <Line c={c} x={col[2] + 14} y={630} size={9.5} parts={[["mp", "af_sub4=f5bd1ba5-…"]]} />
      {small(col[2] + 14, 652, "the web app reads")}
      <Line c={c} x={col[2] + 14} y={670} size={9.5} parts={[["code", "code"], " → applies the promo"]} />
      <Line c={c} x={col[2] + 14} y={686} size={9.5} parts={[["mp", "af_sub4"], " → mixpanel.identify(…)"]} />
      <Line c={c} x={col[2] + 14} y={702} size={9.5} parts={[["source", "utm_"], " → its own analytics"]} />

      {/* 6. from the redirect page */}
      <path d="M320,720 L320,770" {...line} />
      <path d="M440,720 L440,770" {...line} />
      {small(314, 750, "installs the app", "end")}
      {small(446, 750, "taps Continue on web")}

      <Panel c={c} x={12} y={772} w={360} h={112} title="App Store or Google Play, then first open" />
      {small(26, 808, "AppsFlyer delivers the same deep_link_value on first open")}
      <Line c={c} x={26} y={828} size={9.5} parts={["deep_link_value → opens ", ["screen", "/subscriptions"], ", shows ", ["code", "EON99"]]} />
      <Line c={c} x={26} y={846} size={9.5} parts={[["source", "af_channel"], " … ", ["click", "af_sub3"], " → attributed to the Meta ad"]} />
      <Line c={c} x={26} y={864} size={9.5} parts={[["mp", "af_sub4"], " → mixpanel.identify(…)"]} />

      <Panel c={c} x={388} y={772} w={360} h={112} title="app.eonrides.com, from the redirect page" />
      {small(402, 808, "the script forwards everything onto the Continue on web link")}
      <Line c={c} x={402} y={828} size={9.5} parts={["app.eonrides.com/?", ["source", "utm_source=meta"], "&", ["medium", "utm_medium=paid"]]} />
      <Line c={c} x={402} y={844} size={9.5} parts={["&", ["campaign", "utm_campaign=subs_sept"], "&", ["content", "utm_content=video_a"]]} />
      <Line c={c} x={402} y={860} size={9.5} parts={["&", ["click", "fbclid=IwAR…"], "&", ["code", "code=EON99"], "&", ["mp", "mp_id=f5bd1ba5-…"], "&", ["page", "c=app-redirect-ios"]]} />

      {/* 7. summary strip */}
      <Panel c={c} x={12} y={906} w={736} h={166} title="Where each value ends up" />
      {[
        [["source", "utm_source"], "Meta, the channel that brought the person in. Stays for 30 days. Reaches AppsFlyer as af_channel and the web app as utm_source."],
        [["campaign", "utm_campaign"], "The ad set (af_adset). With utm_medium (af_sub1) and utm_content (af_ad) it identifies the exact ad."],
        [["click", "fbclid"], "The ad network's own click ID. Packed into af_sub3 for AppsFlyer, unpacked again on the way back."],
        [["code", "code"], "The promo. Travels twice: as a plain code= for the web app and inside deep_link_value for the native app."],
        [["mp", "Mixpanel ID"], "af_sub4 on OneLinks, mp_id on internal links. Whoever receives it calls mixpanel.identify, so it is one person everywhere."],
        [["page", "c"], "The page the person tapped on, always the current one. Tells AppsFlyer where on the site the conversion came from."],
      ].map(([key, text], i) => (
        <g key={key[1]}>
          <Line c={c} x={26} y={946 + i * 20} size={9.5} parts={[key]} />
          <text x={126} y={946 + i * 20} fill={c.secondary} fontSize="9.5">{text}</text>
        </g>
      ))}
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
      <text x={60} y={32} fill={c.text} fontSize="11.5" fontWeight="600">On the site</text>
      <text x={430} y={32} fill={c.text} fontSize="11.5" fontWeight="600">In AppsFlyer</text>
      {pairs.map(([site, af], i) => {
        const y = top + i * step;
        return (
          <g key={site}>
            <text x={60} y={y} fill={c.text} fontSize="11" fontFamily={MONO}>{site}</text>
            <line x1={250} y1={y - 4} x2={410} y2={y - 4} stroke={c.border} strokeWidth="1" />
            <circle cx={250} cy={y - 4} r="2.5" fill={c.brand} />
            <circle cx={410} cy={y - 4} r="2.5" fill={c.brand} />
            <text x={430} y={y} fill={c.text} fontSize="11" fontFamily={MONO}>{af}</text>
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
  "mixpanel-overview": MixpanelOverview,
  "mixpanel-flow": MixpanelFlow,
  "mixpanel-event": MixpanelEvent,
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
