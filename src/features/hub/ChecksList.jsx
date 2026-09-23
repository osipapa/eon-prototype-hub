import { Loader2 } from "lucide-react";
import { CHECK_KINDS, issueCount } from "./checks";

export function checkTone(c) {
  return c.bg === "#000000" ? "#F5C451" : "#8A5A00";
}

// "3 issues", "All clear", or where a run stands, for the context row.
export function checksSummary(checks) {
  if (!checks.available) return "Nothing to check";
  if (checks.running) return "Checking…";
  const results = checks.results;
  if (!results) return checks.outdated ? "Out of date" : "Not checked yet";
  if (results.renders && results.failed === results.renders) return "Couldn't check";
  const count = issueCount(results);
  return count ? `${count} ${count === 1 ? "issue" : "issues"}` : "All clear";
}

function whereLabel(where) {
  const values = Object.values(where.args || {}).map(String);
  return [...values, where.theme].filter(Boolean).join(" · ");
}

function whereSummary(issue, renders) {
  if (issue.where.length >= renders) return "Every state, light and dark";
  const first = whereLabel(issue.where[0]);
  return issue.where.length > 1 ? `${first} +${issue.where.length - 1}` : first;
}

function relativeTime(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

/* The body of the Checks row: what the last run found at phone width, grouped
   by kind. Each finding takes you to the state and theme it showed up in. */
export default function ChecksList({ c, checks, onJump }) {
  const results = checks.results || checks.outdated;
  const tone = checkTone(c);

  if (!checks.available) {
    return <p className="eon-context-note" style={{ color: c.muted }}>Upload the prototype's HTML and the checks run on it.</p>;
  }
  if (checks.running && !results) {
    const { done, total } = checks.running;
    return (
      <p className="eon-context-note eon-checks-status" style={{ color: c.muted }}>
        <Loader2 size={13} className="eon-spin" aria-hidden="true" />
        {total ? `Checking ${done} of ${total} at 360px…` : "Starting the checks…"}
      </p>
    );
  }
  if (!results) {
    return <p className="eon-context-note" style={{ color: c.muted }}>Checks run at phone width, in light and dark, when a prototype opens on a desktop.</p>;
  }
  if (results.renders && results.failed === results.renders) {
    return <p className="eon-context-note" style={{ color: c.muted }}>This prototype didn't finish loading in time, so nothing was measured. Run again once it loads.</p>;
  }

  const groups = CHECK_KINDS
    .map((group) => ({ ...group, issues: results.issues.filter((issue) => issue.kind === group.kind) }))
    .filter((group) => group.issues.length);
  const count = issueCount(results);

  return (
    <div className="eon-checks" style={{ opacity: checks.results ? 1 : 0.55 }}>
      {checks.running && (
        <p className="eon-context-note eon-checks-status" style={{ color: c.muted }}>
          <Loader2 size={13} className="eon-spin" aria-hidden="true" />
          {checks.running.total ? `Checking again, ${checks.running.done} of ${checks.running.total}…` : "Checking again…"}
        </p>
      )}
      {!count && <p className="eon-context-note" style={{ color: c.muted }}>Nothing to fix at 360px in light or dark.</p>}
      {groups.map((group) => (
        <section key={group.kind} className="eon-checks-group">
          <h4 style={{ color: c.muted }}>{group.title} <span>{group.issues.length}</span></h4>
          <ul>
            {group.issues.map((issue) => (
              <li key={`${issue.kind}-${issue.selector}`}>
                <button className="eon-buttonish eon-check-issue" onClick={() => onJump(issue, issue.where[0])}
                  disabled={!issue.selector}
                  title={issue.selector ? "Show it on the prototype" : undefined}
                  style={{ color: c.text }}>
                  <span className="eon-check-issue-label">{issue.label}</span>
                  <span className="eon-check-issue-detail" style={{ color: tone }}>{issue.detail}</span>
                  <span className="eon-check-issue-where" style={{ color: c.muted }}>{whereSummary(issue, results.renders)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {results.missing?.length > 0 && (
        <section className="eon-checks-group">
          <h4 style={{ color: c.muted }}>States</h4>
          <p className="eon-context-note" style={{ color: c.secondary }}>
            No {results.missing.join(", ").replace(/, ([^,]*)$/, " or $1")} state. Declare it in the prototype's eon-config so reviewers can switch to it.
          </p>
        </section>
      )}
      {checks.checkedAt && (
        <p className="eon-checks-meta" style={{ color: c.muted }}>
          Checked {relativeTime(checks.checkedAt)} · {Math.round(results.renders / 2)} {Math.round(results.renders / 2) === 1 ? "state" : "states"} in light and dark at 360×780
          {results.failed ? ` · ${results.failed} didn't load` : ""}
        </p>
      )}
    </div>
  );
}
