import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, BarChart3, Check, ClipboardCheck, Code2, Copy,
  Download, FileText, Globe, Monitor, Smartphone,
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

function Checklist({ c, items, Icon, tone, numbered }) {
  return (
    <div className="eon-tracking-checklist" style={{ background: c.panel, boxShadow: shadow }}>
      {items.map((item, index) => (
        <div key={item} style={{ borderColor: c.border }}>
          <span className={`is-${tone}`}>{numbered ? <b>{index + 1}</b> : <Icon size={14} aria-hidden="true" />}</span>
          <p style={{ color: c.secondary }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Websites: attribution & routing ---------- */

function Callout({ c, tone = "info", children }) {
  return (
    <div className={`eon-attr-callout is-${tone}`} style={{ background: c.panel, boxShadow: shadow }}>
      <AlertTriangle size={15} aria-hidden="true" />
      <p style={{ color: c.secondary }}>{children}</p>
    </div>
  );
}

function CodeBlock({ c, children, label }) {
  return (
    <figure className="eon-attr-code" style={{ background: c.panel, boxShadow: shadow }}>
      {label && <figcaption style={{ color: c.muted }}>{label}</figcaption>}
      <pre style={{ color: c.text }}>{children}</pre>
    </figure>
  );
}

function Table({ c, head, rows, minWidth }) {
  return (
    <div className="eon-attr-table" style={{ background: c.panel, boxShadow: shadow }}>
      <div className="eon-tracking-table-wrap">
        <table className="eon-tracking-table eon-attr-table-el" style={minWidth ? { minWidth } : undefined}>
          <thead style={{ color: c.muted }}><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} style={{ borderColor: c.border }}>
                {row.map((cell, cellIndex) => <td key={cellIndex} style={{ color: cellIndex === 0 ? c.text : c.secondary }}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Mono({ children, className = "" }) {
  return <code className={`eon-attr-mono ${className}`.trim()}>{children}</code>;
}

function AttrJobs({ c }) {
  return (
    <>
      <div className="eon-attr-status">
        {wa.status.map((item) => (
          <span key={item.label} className={`eon-attr-pill is-${item.tone}`}>{item.label}</span>
        ))}
        <span className="eon-attr-pill" style={{ background: c.active, color: c.secondary }}>v{wa.version} · {wa.date}</span>
      </div>
      <div className="eon-tracking-steps eon-attr-jobs">
        {wa.jobs.map((job, index) => (
          <div className="eon-tracking-step" key={job.title} style={{ background: c.panel, boxShadow: shadow }}>
            <span style={{ background: c.active, color: c.brand }}>{index + 1}</span>
            <div>
              <strong>{job.title}</strong>
              <p style={{ color: c.secondary }}>{job.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="eon-tracking-meta eon-attr-meta" style={{ borderColor: c.border }}>
        <div><span>File</span><strong><Mono>{wa.file}</Mono></strong></div>
        <div><span>Lives in</span><strong>{wa.livesIn}</strong></div>
      </div>
      <Callout c={c} tone="warn">{wa.note}</Callout>
    </>
  );
}

function SystemMap({ c }) {
  const node = { fill: c.panel, stroke: c.border };
  const Box = ({ x, y, w, h, title, sub, accent }) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill={node.fill} stroke={accent ? c.brand : node.stroke} strokeWidth={accent ? 1.5 : 1} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 5 : h / 2 + 4)} textAnchor="middle" fill={c.text} fontSize="11.5" fontWeight="650">{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fill={c.muted} fontSize="9.5">{sub}</text>}
    </g>
  );
  const Label = ({ x, y, children, anchor = "middle" }) => (
    <text x={x} y={y} textAnchor={anchor} fill={c.brand} fontSize="9" fontWeight="700" letterSpacing=".06em">{children}</text>
  );
  const line = { stroke: c.muted, strokeWidth: 1.2, fill: "none", markerEnd: "url(#eon-attr-arrow)" };
  return (
    <figure className="eon-attr-map" style={{ background: c.panel, boxShadow: shadow }}>
      <svg viewBox="0 0 760 470" role="img" aria-label="System map: an ad lands on www.eonrides.com, the footer script stamps OneLink hrefs, AppsFlyer OneLink routes to the native app, the app-redirect pages, or the web app.">
        <defs>
          <marker id="eon-attr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c.muted} />
          </marker>
        </defs>

        {/* Ad → site */}
        <g>
          <rect x="12" y="28" width="150" height="54" rx="27" fill={c.active} />
          <text x="87" y="52" textAnchor="middle" fill={c.text} fontSize="11.5" fontWeight="650">Ad / referrer</text>
          <text x="87" y="67" textAnchor="middle" fill={c.muted} fontSize="9" fontFamily="ui-monospace, Menlo, monospace">?utm_*&amp;fbclid&amp;code</text>
        </g>
        <path d="M162,55 L226,55" {...line} />
        <Box x={228} y={22} w={330} h={66} title="www.eonrides.com (Webflow)" sub="footer script on every page" accent />

        {/* site → OneLink */}
        <path d="M393,88 L393,140" {...line} />
        <Label x={402} y={118} anchor="start">STAMPED ONELINK HREF</Label>
        <Box x={228} y={142} w={330} h={66} title="go.eonrides.com/nQbG/<link>" sub="AppsFlyer OneLink · records click + attribution" />

        {/* three branches */}
        <path d="M300,208 L300,240 L120,240 L120,288" {...line} />
        <path d="M393,208 L393,288" {...line} />
        <path d="M486,208 L486,240 L640,240 L640,288" {...line} />
        <Label x={120} y={276}>APP INSTALLED</Label>
        <Label x={393} y={276}>NO APP</Label>
        <Label x={640} y={276}>DESKTOP</Label>
        <Box x={20} y={290} w={200} h={62} title="Eon app" sub="Universal / App Link · UDL" />
        <Box x={283} y={290} w={220} h={62} title="/app-redirect-ios · -android" sub="renders only without the app" />
        <Box x={540} y={290} w={200} h={62} title="app.eonrides.com" sub="web app" />

        {/* redirect page → store / web */}
        <path d="M340,352 L340,400" {...line} />
        <path d="M446,352 L446,400" {...line} />
        <Box x={232} y={402} w={200} h={56} title="Store → install" sub="deferred deep link on first open" />
        <Box x={456} y={402} w={200} h={56} title="Continue on web" sub="→ app.eonrides.com, attribution forwarded" />
      </svg>
    </figure>
  );
}

function EntryPoints({ c }) {
  return (
    <>
      <CodeBlock c={c} label="Campaign landing URL — what goes in the ad">{wa.landingUrl}</CodeBlock>
      <CodeBlock c={c} label="Example · Meta subscription ad set">{wa.landingExample}</CodeBlock>
      <Table
        c={c}
        head={["Param", "Purpose", "Stored", "Forwarded"]}
        rows={wa.landingParams.map((p) => [
          <Mono key="n">{p.name}</Mono>,
          p.purpose,
          <span key="s" className={`eon-attr-tag is-${p.stored === "first-touch" ? "first" : p.stored === "last-touch" ? "last" : "none"}`}>{p.stored}</span>,
          p.forwarded ? "yes" : "no",
        ])}
      />
      <p className="eon-attr-note" style={{ color: c.secondary }}>{wa.redirectNote}</p>
      <CodeBlock c={c} label="AppsFlyer fallback / redirect URL — what the script receives back">{wa.redirectUrl}</CodeBlock>
    </>
  );
}

function Config({ c }) {
  return (
    <>
      <CodeBlock c={c} label="Central configuration">{wa.config}</CodeBlock>
      <div className="eon-attr-defs">
        {wa.configMeaning.map((item) => (
          <div key={item.name} style={{ background: c.panel, boxShadow: shadow }}>
            <Mono>{item.name}</Mono>
            <p style={{ color: c.secondary }}>{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="eon-attr-ids" style={{ background: c.panel, boxShadow: shadow }}>
        {wa.identifiers.map((item) => (
          <div key={item.label} style={{ borderColor: c.border }}>
            <span style={{ color: c.muted }}>{item.label}</span>
            <Mono>{item.value}</Mono>
          </div>
        ))}
      </div>
    </>
  );
}

function Pipeline({ c }) {
  return (
    <div className="eon-attr-pipeline" role="list" aria-label="Script pipeline in execution order">
      {wa.pipeline.map((stage, index) => (
        <div key={stage.step} className="eon-attr-stage" role="listitem" style={{ background: c.panel, boxShadow: shadow }}>
          <div className="eon-attr-stage-head">
            <span style={{ background: c.active, color: c.brand }}>{index + 1}</span>
            <small style={{ color: c.muted }}>{stage.tag}</small>
          </div>
          <strong>{stage.title}</strong>
          <p style={{ color: c.secondary }}>{stage.summary}</p>
          {stage.points.length > 0 && (
            <ul>
              {stage.points.map((point) => <li key={point} style={{ color: c.secondary }}><ArrowRight size={11} aria-hidden="true" style={{ color: c.brand }} />{point}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function Normalize({ c }) {
  return (
    <div className="eon-attr-mapping" style={{ background: c.panel, boxShadow: shadow }}>
      {wa.normalize.map((row) => (
        <div key={row.from} style={{ borderColor: c.border }}>
          <Mono>{row.from}</Mono>
          <ArrowRight size={14} aria-hidden="true" style={{ color: c.brand }} />
          <Mono>{row.to}</Mono>
          {row.note && <small style={{ color: c.muted }}>{row.note}</small>}
        </div>
      ))}
    </div>
  );
}

function Snapshot({ c }) {
  return (
    <div className="eon-attr-snapshot">
      <figure className="eon-attr-code eon-attr-json" style={{ background: c.panel, boxShadow: shadow }}>
        <figcaption style={{ color: c.muted }}>localStorage · <Mono>eon_attr</Mono></figcaption>
        <div>
          <span style={{ color: c.muted }}>{"{"}</span>
          {wa.snapshot.map((field) => (
            <span key={field.key} className={`is-${field.tone}`}>
              <i style={{ color: c.text }}>"{field.key}"</i>: <em style={{ color: c.secondary }}>{field.value}</em>,
              {field.tone !== "meta" && <b className={`eon-attr-tag is-${field.tone}`}>{field.tone === "first" ? "first-touch" : field.tone === "last" ? "last-touch" : "reference"}</b>}
            </span>
          ))}
          <span style={{ color: c.muted }}>{"}"}</span>
        </div>
      </figure>
      <div className="eon-attr-legend">
        {wa.snapshotLegend.map((item) => (
          <div key={item.tone} style={{ background: c.panel, boxShadow: shadow }}>
            <b className={`eon-attr-tag is-${item.tone}`}>{item.label}</b>
            <p style={{ color: c.secondary }}>{item.detail}</p>
          </div>
        ))}
        <p style={{ color: c.muted }}>Captured when no valid snapshot exists and the URL carries any signal (c, utm_*, a click ID, or code). Expires after 30 days.</p>
      </div>
    </div>
  );
}

function Precedence({ c }) {
  return (
    <div className="eon-attr-precedence" style={{ background: c.panel, boxShadow: shadow }}>
      {wa.precedence.map((row) => (
        <div key={row.value} style={{ borderColor: c.border }}>
          <Mono>{row.value}</Mono>
          <div>
            {row.chain.map((step, index) => (
              <span key={step}>
                {index > 0 && <ArrowRight size={12} aria-hidden="true" style={{ color: c.muted }} />}
                <em style={{ background: index === 0 ? c.active : "transparent", color: index === 0 ? c.text : c.secondary, borderColor: c.border }}>{step}</em>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stamp({ c }) {
  return (
    <>
      <CodeBlock c={c} label={'Rebuilt href · <a data-add-slug="true"> on go.eonrides.com or *.onelink.me'}>{wa.stampShape}</CodeBlock>
      <Table
        c={c}
        head={["Output param", "From", "Example"]}
        rows={wa.stampParams.map((p) => [<Mono key="p">{p.param}</Mono>, p.from, <Mono key="e">{p.example}</Mono>])}
      />
      <p className="eon-attr-note" style={{ color: c.secondary }}>Every value is <Mono>encodeURIComponent()</Mono>-ed individually. Script values override params already on the href.</p>
    </>
  );
}

function DeepLinkValue({ c }) {
  return (
    <>
      <div className="eon-attr-pair">
        <CodeBlock c={c} label="Shape — the native app navigates to pathname and shows the promo popup if code is present">{wa.dlvShape}</CodeBlock>
        <CodeBlock c={c} label="On the URL">{wa.dlvEncoded}</CodeBlock>
      </div>
      <div className="eon-attr-chips">
        <span style={{ color: c.muted }}>Known routes</span>
        {wa.dlvRoutes.map((route) => <Mono key={route}>{route}</Mono>)}
      </div>
      <Callout c={c} tone="warn">{wa.dlvOverride}</Callout>
      <Table
        c={c}
        minWidth={640}
        head={["Button", "pathname (map / attribute)", "data-dlv-code", "Visit had ?code=", "Emitted deep_link_value"]}
        rows={wa.dlvMatrix.map((row) => [row.button, row.pathname, row.code, row.visit, <Mono key="e">{row.emitted}</Mono>])}
      />
      <p className="eon-attr-note" style={{ color: c.secondary }}>{wa.dlvTip}</p>
    </>
  );
}

function Webflow({ c }) {
  return (
    <>
      <Table
        c={c}
        head={["Attribute", "Put on", "Effect"]}
        rows={wa.attributes.map((a) => [<Mono key="a">{a.name}</Mono>, a.on, a.effect])}
      />
      <p className="eon-attr-note" style={{ color: c.secondary }}>{wa.attributesNote}</p>
      <div className="eon-attr-chips">
        <span style={{ color: c.muted }}>Not read any more · safe to remove</span>
        {wa.legacyAttributes.map((name) => <Mono key={name} className="is-legacy">{name}</Mono>)}
      </div>
    </>
  );
}

function RedirectPages({ c }) {
  return (
    <>
      <Table
        c={c}
        head={["Element", "URL", "Why"]}
        rows={wa.redirectPages.map((row) => [row.element, <Mono key="u">{row.url}</Mono>, row.why])}
      />
      <p className="eon-attr-note" style={{ color: c.secondary }}>{wa.redirectSettings}</p>
    </>
  );
}

const OUTCOME_ICONS = { desktop: Monitor, installed: Smartphone, store: Download, web: Globe };

function Outcomes({ c }) {
  return (
    <div className="eon-attr-outcomes">
      {wa.outcomes.map((item) => {
        const Icon = OUTCOME_ICONS[item.icon];
        return (
          <div key={item.device} style={{ background: c.panel, boxShadow: shadow }}>
            <span className="eon-accent-icon" style={{ background: c.active, color: c.brand }}><Icon size={16} aria-hidden="true" /></span>
            <strong>{item.device}</strong>
            <dl>
              <dt style={{ color: c.muted }}>Path</dt><dd style={{ color: c.secondary }}>{item.path}</dd>
              <dt style={{ color: c.muted }}>Arrives</dt><dd><Mono>{item.arrives}</Mono></dd>
              <dt style={{ color: c.muted }}>Result</dt><dd style={{ color: c.secondary }}>{item.result}</dd>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function Identity({ c }) {
  return (
    <Table
      c={c}
      head={["Hop", "Carrier", "Consumer must"]}
      rows={wa.identity.map((row) => [row.hop, <Mono key="c">{row.carrier}</Mono>, row.consumer])}
    />
  );
}

function Behavior({ c }) {
  return (
    <Table
      c={c}
      minWidth={760}
      head={["Scenario", "c", "af_channel", "code", "deep_link_value (subscription CTA)"]}
      rows={wa.behavior.map((row) => [row.scenario, <Mono key="c">{row.c}</Mono>, row.channel, row.code, <Mono key="d">{row.dlv}</Mono>])}
    />
  );
}

function AppsFlyer({ c }) {
  return (
    <>
      <Table
        c={c}
        head={["Setting", "Value"]}
        rows={wa.appsflyer.map((row) => [row.setting, <Mono key="v">{row.value}</Mono>])}
      />
      <p className="eon-attr-note" style={{ color: c.secondary }}>{wa.appsflyerNote}</p>
      <div className="eon-attr-defs">
        {wa.appSide.map((item) => (
          <div key={item.surface} style={{ background: c.panel, boxShadow: shadow }}>
            <strong>{item.surface}</strong>
            <p style={{ color: c.secondary }}>{item.detail}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function DebugQa({ c }) {
  return (
    <>
      <Table
        c={c}
        head={["Console call", "Returns"]}
        rows={wa.debug.map((row) => [<Mono key="c">{row.call}</Mono>, row.returns])}
      />
      <h3 className="eon-attr-subhead">QA checklist</h3>
      <Checklist c={c} items={wa.qa} Icon={ClipboardCheck} tone="success" numbered />
      <h3 className="eon-attr-subhead">Rollout</h3>
      <Checklist c={c} items={wa.rollout} Icon={Code2} tone="info" numbered />
    </>
  );
}

function Changes({ c }) {
  return (
    <>
      <Checklist c={c} items={wa.changes} Icon={Check} tone="info" />
      <p className="eon-attr-note" style={{ color: c.secondary }}>{wa.changesNote}</p>
    </>
  );
}

const BLOCKS = {
  "mixpanel-steps": MixpanelSteps,
  "mixpanel-event": MixpanelEvent,
  "mixpanel-guardrails": ({ c }) => <Checklist c={c} items={mp.guardrails} Icon={Code2} tone="info" />,
  "mixpanel-qa": ({ c }) => <Checklist c={c} items={mp.qa} Icon={ClipboardCheck} tone="success" />,
  "mixpanel-prompt": MixpanelPrompt,
  "attr-jobs": AttrJobs,
  "attr-map": SystemMap,
  "attr-entry": EntryPoints,
  "attr-config": Config,
  "attr-pipeline": Pipeline,
  "attr-normalize": Normalize,
  "attr-snapshot": Snapshot,
  "attr-precedence": Precedence,
  "attr-stamp": Stamp,
  "attr-dlv": DeepLinkValue,
  "attr-webflow": Webflow,
  "attr-redirect": RedirectPages,
  "attr-outcomes": Outcomes,
  "attr-identity": Identity,
  "attr-behavior": Behavior,
  "attr-appsflyer": AppsFlyer,
  "attr-debug": DebugQa,
  "attr-changes": Changes,
};
