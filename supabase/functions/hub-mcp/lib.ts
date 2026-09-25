// Pure helpers for the hub MCP. No I/O, so Deno tests import them directly.

// Reads a JWT's payload without verifying it. Verification happens through
// auth.getUser(); this only surfaces claims such as client_id for display.
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = new TextDecoder().decode(Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)));
    const value = JSON.parse(json);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export type EditResult =
  | { ok: true; html: string; count: number; firstIndex: number }
  | { ok: false; error: string };

// Exact-text replacement, the same contract as Claude Code's Edit tool.
export function applyEdit(html: string, oldString: string, newString: string, replaceAll = false): EditResult {
  if (oldString === "") return { ok: false, error: "old_string is empty. Quote the exact text to replace." };
  if (oldString === newString) return { ok: false, error: "old_string and new_string are identical, so there is nothing to change." };
  const firstIndex = html.indexOf(oldString);
  if (firstIndex === -1) {
    return { ok: false, error: "old_string not found. The prototype may have changed: re-read it, then retry with the current text." };
  }
  const count = html.split(oldString).length - 1;
  if (count > 1 && !replaceAll) {
    return { ok: false, error: `old_string matches ${count} places. Add surrounding context to make it unique, or set replace_all.` };
  }
  const next = replaceAll
    ? html.split(oldString).join(newString)
    : html.slice(0, firstIndex) + newString + html.slice(firstIndex + oldString.length);
  return { ok: true, html: next, count: replaceAll ? count : 1, firstIndex };
}

export const PAGE_CHAR_BUDGET = 40_000;

export type Page = {
  text: string; startLine: number; startChar: number; endLine: number; totalLines: number;
  nextStartLine: number | null; nextStartChar: number;
};

// Numbered lines ("12\t<div>…"), capped by characters so a page fits in one
// MCP result. A line longer than the budget (minified HTML, inline data:
// URIs) comes back in chunks: continue with nextStartLine + nextStartChar.
export function pageLines(html: string, startLine = 1, endLine?: number, budget = PAGE_CHAR_BUDGET, startChar = 0): Page {
  const lines = html.split("\n");
  const totalLines = lines.length;
  const start = Math.min(Math.max(1, Math.floor(startLine)), totalLines);
  const last = Math.max(start, Math.min(endLine ? Math.floor(endLine) : totalLines, totalLines));
  const fromChar = Math.max(0, Math.floor(startChar));
  const firstRest = lines[start - 1].slice(fromChar);
  if (firstRest.length > budget) {
    return {
      text: `${start}\t${firstRest.slice(0, budget)}`, startLine: start, startChar: fromChar, endLine: start,
      totalLines, nextStartLine: start, nextStartChar: fromChar + budget,
    };
  }
  const rows: string[] = [];
  let used = 0;
  let n = start;
  for (; n <= last; n++) {
    const row = `${n}\t${n === start ? firstRest : lines[n - 1]}`;
    if (rows.length > 0 && used + row.length + 1 > budget) break;
    rows.push(row);
    used += row.length + 1;
  }
  const shownEnd = n - 1;
  return {
    text: rows.join("\n"), startLine: start, startChar: fromChar, endLine: shownEnd, totalLines,
    nextStartLine: shownEnd < last ? shownEnd + 1 : null, nextStartChar: 0,
  };
}

export type Match = { line: number; text: string };

export function searchLines(
  html: string, pattern: string, regex = false, limit = 50, clip = 300,
): { matches: Match[]; total: number } | { error: string } {
  if (!pattern) return { error: "pattern is empty." };
  let find: (line: string) => number;
  if (regex) {
    let re: RegExp;
    try { re = new RegExp(pattern); } catch (error) { return { error: `Invalid regex: ${(error as Error).message}` }; }
    find = (line) => line.search(re);
  } else {
    find = (line) => line.indexOf(pattern);
  }
  const matches: Match[] = [];
  let total = 0;
  html.split("\n").forEach((line, index) => {
    const at = find(line);
    if (at === -1) return;
    total += 1;
    if (matches.length < limit) matches.push({ line: index + 1, text: clipAround(line, at, clip) });
  });
  return { matches, total };
}

// A window of `width` characters that keeps position `at` in view.
export function clipAround(line: string, at: number, width: number): string {
  if (line.length <= width) return line;
  const start = Math.max(0, Math.min(at - Math.floor(width / 2), line.length - width));
  return `${start > 0 ? "…" : ""}${line.slice(start, start + width)}${start + width < line.length ? "…" : ""}`;
}

// Numbered lines around a character index, each clipped to 300 characters
// (around the change on its own line), so edits on minified HTML stay short.
export function contextAround(html: string, index: number, radius = 2): string {
  const before = html.slice(0, index);
  const lineNo = before.split("\n").length;
  const column = index - (before.lastIndexOf("\n") + 1);
  const lines = html.split("\n");
  const from = Math.max(1, lineNo - radius);
  const to = Math.min(lines.length, lineNo + radius);
  const rows: string[] = [];
  for (let n = from; n <= to; n++) rows.push(`${n}\t${clipAround(lines[n - 1], n === lineNo ? column : 0, 300)}`);
  return rows.join("\n");
}
