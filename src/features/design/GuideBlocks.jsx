import { Fragment } from "react";
import { ArrowDown, ArrowRight, Check, GitBranch, ListChecks, MessageSquareText, ShieldCheck } from "lucide-react";
import TrackingBlock from "@/features/tracking/TrackingBlocks";
import { ESTIMATE_SCALE, LINEAR_FLOW, QA_FINDINGS, QA_RULES } from "@kb/blocks.js";

/* The interactive blocks an Eon Design page embeds with a ```eon:<name>```
   fence. Their data lives in @kb/blocks.js, where the hub MCP reads it too. */
export default function GuideBlock({ name, arg, c, onOpenPrompts }) {
  if (name === "linear-flow") return <LinearHandoffFlow flow={LINEAR_FLOW} c={c} />;
  if (name === "estimate-scale") return <EstimateScale scale={ESTIMATE_SCALE} c={c} />;
  if (name === "estimate-examples") return <EstimateExamples c={c} />;
  if (name === "qa-protocol") return <QaCommentProtocol c={c} />;
  if (name === "tracking") return <div className="eon-docs-tracking"><TrackingBlock block={arg} c={c} onOpenPrompts={onOpenPrompts} /></div>;
  return <p className="eon-docs-unknown" style={{ color: c.muted }}>Unknown block “{name}”.</p>;
}

const WEEKDAYS = [["Mon", "M"], ["Tue", "T"], ["Wed", "W"], ["Thu", "T"], ["Fri", "F"]];

const hatchFill = (color) => `repeating-linear-gradient(135deg, ${color} 0 1px, transparent 1px 5px)`;

// Spoken length of an estimate, for the row a screen reader reads instead of the bars.
const estimateLength = (days) => (days < 1 ? `about ${days * 8} hours` : `about ${days} working ${days === 1 ? "day" : "days"}`);

/* One row per size, each a single working week filled from Monday, so the
   doubling reads as bars growing against the same five days. Sizes past a
   week sit under the split line with the week hatched. */
function EstimateScale({ scale, c }) {
  const hatch = hatchFill(c.muted);
  return (
    <figure className="eon-est" aria-label="Estimate scale" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
      <div className="eon-est-axis" aria-hidden="true" style={{ color: c.muted }}>
        <div>{WEEKDAYS.map(([day, short]) => <span key={day}><b className="is-long">{day}</b><b className="is-short">{short}</b></span>)}</div>
      </div>
      <ol className="eon-est-rows">
        {scale.map((step, index) => (
          <Fragment key={step.points}>
            {step.oversized && !scale[index - 1]?.oversized && (
              <li className="eon-est-split" style={{ color: c.muted }}>Split before it gets here</li>
            )}
            <li className={`eon-est-row${step.oversized ? " is-oversized" : ""}`}>
              <strong className="eon-est-points">{step.points}<span className="eon-visually-hidden"> points</span></strong>
              <span className="eon-est-meaning" style={{ color: c.secondary }}>{step.meaning}<span className="eon-visually-hidden">, {estimateLength(step.days)}.</span></span>
              <div className="eon-est-week" aria-hidden="true">
                {WEEKDAYS.map(([day], dayIndex) => {
                  const filled = Math.max(0, Math.min(1, step.days - dayIndex));
                  return (
                    <span key={day} style={{ background: c.raised }}>
                      {filled > 0 && <i style={{ width: `${filled * 100}%`, background: step.oversized ? hatch : c.brand }} />}
                    </span>
                  );
                })}
              </div>
              <p className="eon-est-note" style={{ color: c.muted }}>{step.note}</p>
            </li>
          </Fragment>
        ))}
      </ol>
    </figure>
  );
}

function EstimateTicket({ c, title, children }) {
  return (
    <div className="eon-est-ticket" style={{ background: c.raised }}>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

function EstimatePoints({ c, children, oversized = false }) {
  return (
    <span className="eon-est-pill" style={oversized ? { boxShadow: `inset 0 0 0 1px ${c.muted}`, color: c.secondary } : { background: c.panel, color: c.text }}>
      {children}
    </span>
  );
}

function EstimateExamples({ c }) {
  return (
    <div className="eon-est-examples">
      <figure style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
        <figcaption>
          <strong>Split it</strong>
          <p style={{ color: c.secondary }}>A card past 16 becomes smaller cards that each ship something.</p>
        </figcaption>
        <div className="eon-est-demo">
          <EstimateTicket c={c} title="Trip review flow">
            <EstimatePoints c={c} oversized>32</EstimatePoints>
          </EstimateTicket>
          <ArrowDown className="eon-est-demo-arrow" size={15} role="img" aria-label="Split into" style={{ color: c.muted }} />
          <EstimateTicket c={c} title="Rate the trip">
            <EstimatePoints c={c}>16</EstimatePoints>
          </EstimateTicket>
          <EstimateTicket c={c} title="Add photos to a review">
            <EstimatePoints c={c}>16</EstimatePoints>
          </EstimateTicket>
        </div>
      </figure>
      <figure style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
        <figcaption>
          <strong>Re-point with a reason</strong>
          <p style={{ color: c.secondary }}>When scope changes, change the number and say why on the card.</p>
        </figcaption>
        <div className="eon-est-demo">
          <EstimateTicket c={c} title="Vehicle carousel scroll affordance">
            <EstimatePoints c={c}><s style={{ color: c.muted }}>4</s><ArrowRight size={11} aria-hidden="true" /><span className="eon-visually-hidden">changed to</span>8</EstimatePoints>
          </EstimateTicket>
          <div className="eon-est-comment" style={{ background: c.active }}>
            <span style={{ background: c.raised, color: c.brand }}>You</span>
            <p style={{ color: c.secondary }}>Review added the empty and loading states.</p>
          </div>
        </div>
      </figure>
    </div>
  );
}

function LinearHandoffFlow({ flow, c }) {
  return (
    <div className="eon-linear-flow" aria-label="Linear handoff board flow">
      <section className="eon-linear-example" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
        <header>
          <span className="eon-accent-icon" style={{ background: c.active, color: c.brand }}><ListChecks size={17} aria-hidden="true" /></span>
          <div>
            <small style={{ color: c.brand }}>Example ticket · {flow.ticket.template}</small>
            <h3>{flow.ticket.id} · {flow.ticket.title}</h3>
            <p style={{ color: c.secondary }}>The complete ticket moves through every column below. Keep its context in one place.</p>
          </div>
        </header>
        <div className="eon-linear-example-body">
          <div className="eon-linear-example-meta">
            {flow.ticket.meta.map((item) => <span key={item} style={{ background: c.active, color: c.secondary }}>{item}</span>)}
          </div>
          <ul>
            {flow.ticket.context.map((item) => <li key={item}><Check className="eon-accent-icon" size={12} aria-hidden="true" style={{ color: c.brand }} />{item}</li>)}
          </ul>
        </div>
      </section>

      <div className="eon-linear-board-heading">
        <div>
          <GitBranch className="eon-accent-icon" size={16} aria-hidden="true" style={{ color: c.brand }} />
          <strong>Ticket path</strong>
        </div>
      </div>

      <div className="eon-linear-board" role="list" tabIndex="0" aria-label="Linear workflow columns">
        {flow.columns.map((column, index) => (
          <article
            className="eon-linear-column"
            key={`${column.board}-${column.status}`}
            role="listitem"
            style={{ background: c.panel, boxShadow: "var(--shadow-surface)", "--linear-status": column.color }}
          >
            <header>
              <div>
                <span className="eon-linear-status-dot" aria-hidden="true" />
                <strong>{column.status}</strong>
              </div>
              <p><span style={{ color: c.muted }}>{column.board} board</span><b style={{ color: column.color }}>{column.type}</b></p>
            </header>

            <div className="eon-linear-column-owner" style={{ background: c.active }}>
              <span style={{ color: c.muted }}>Moved by</span>
              <strong>{column.owner}</strong>
            </div>

            <div className="eon-linear-ticket" style={{ background: c.raised }}>
              <div><span style={{ color: c.muted }}>{index < 5 ? flow.ticket.id : "ENG-###"}</span><b style={{ background: `${column.color}20`, color: column.color }}>{column.state}</b></div>
              <strong>{flow.ticket.title}</strong>
              <p style={{ color: c.secondary }}>{column.action}</p>
              {column.reviews && (
                <ul className="eon-linear-review-labels" aria-label="Required approval labels">
                  {column.reviews.map((review) => (
                    <li key={review.label} style={{ "--review-color": review.color }}>
                      <span aria-hidden="true" />
                      <div><strong>{review.label}</strong><small style={{ color: c.muted }}>{review.owner}</small></div>
                      {review.label === "Approved" ? <Check size={13} aria-hidden="true" /> : <ShieldCheck size={13} aria-hidden="true" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer>
              <span style={{ color: c.muted }}>Move on when</span>
              <p style={{ color: c.secondary }}>{column.exit}</p>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function QaCommentProtocol({ c }) {
  return (
    <div className="eon-qa-protocol">
      <div className="eon-qa-thread" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
        <article className="eon-qa-comment" style={{ background: c.raised }}>
          <header>
            <span style={{ background: c.active, color: c.brand }}>You</span>
            <div><strong>Design QA findings</strong><small style={{ color: c.muted }}>Original comment · keep this thread open</small></div>
          </header>
          <ul>
            {QA_FINDINGS.map((finding) => <li key={finding}><span className="eon-accent-icon" style={{ color: c.brand }}><Check size={12} /></span><p>{finding}</p></li>)}
          </ul>
          <div className="eon-qa-reply" style={{ background: c.active }}>
            <MessageSquareText className="eon-accent-icon" size={15} aria-hidden="true" style={{ color: c.brand }} />
            <div><strong>Round 2 reply</strong><p style={{ color: c.secondary }}>Add the next QA pass as a reply here. Do not open another top-level comment.</p></div>
          </div>
        </article>
      </div>
      <ol className="eon-qa-rules">
        {QA_RULES.map(([title, body], index) => (
          <li key={title}><span style={{ background: c.active, color: c.brand }}>{index + 1}</span><div><strong>{title}</strong><p style={{ color: c.secondary }}>{body}</p></div></li>
        ))}
      </ol>
    </div>
  );
}
