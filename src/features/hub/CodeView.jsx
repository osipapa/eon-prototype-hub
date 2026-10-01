import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/uiState";

/* A read-only code panel: line numbers, light syntax colours, and a copy
   button. The highlighter is a few regexes, enough for the HTML, CSS, and
   JavaScript an animation demo is made of. */

function lexer(parts) {
  return new RegExp(parts.map(([name, re]) => `(?<${name}>${re.source})`).join("|"), "g");
}

const HTML = lexer([
  ["com", /<!--[\s\S]*?-->/],
  ["tag", /<\/?[A-Za-z][\w-]*|\/?>/],
  ["attr", /[\w:-]+(?==)/],
  ["str", /"[^"]*"|'[^']*'/],
]);
const CSS = lexer([
  ["com", /\/\*[\s\S]*?\*\//],
  ["str", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/],
  ["at", /@[\w-]+/],
  ["brace", /[{}]/],
  ["prop", /--?[\w-]+(?=\s*:)|[a-z][\w-]*(?=\s*:)/],
  ["fn", /[\w-]+(?=\()/],
  ["num", /#[0-9a-fA-F]{3,8}\b|-?\d*\.?\d+(?:px|%|deg|ms|s|vw|vh|em|rem|fr)?\b/],
]);
const JS = lexer([
  ["com", /\/\/[^\n]*|\/\*[\s\S]*?\*\//],
  ["str", /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/],
  ["key", /\b(?:const|let|var|function|return|if|else|for|while|do|new|true|false|null|undefined|this|typeof|of|in|break|continue)\b/],
  ["fn", /[A-Za-z_$][\w$]*(?=\s*\()/],
  ["num", /\b\d*\.?\d+\b/],
]);

function tokenize(text, pattern, out, css = false) {
  let last = 0;
  let depth = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push([text.slice(last, match.index), null]);
    let kind = Object.keys(match.groups).find((name) => match.groups[name] !== undefined);
    if (css && kind === "brace") { depth += match[0] === "{" ? 1 : -1; kind = null; }
    // Outside a rule block, "a:hover" is a selector, not a property.
    if (css && kind === "prop" && depth === 0) kind = null;
    out.push([match[0], kind]);
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push([text.slice(last), null]);
}

function highlight(code) {
  const tokens = [];
  const blocks = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)|(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi;
  let last = 0;
  for (const match of code.matchAll(blocks)) {
    tokenize(code.slice(last, match.index), HTML, tokens);
    const style = match[1] !== undefined;
    tokenize(style ? match[1] : match[4], HTML, tokens);
    tokenize(style ? match[2] : match[5], style ? CSS : JS, tokens, style);
    tokenize(style ? match[3] : match[6], HTML, tokens);
    last = match.index + match[0].length;
  }
  tokenize(code.slice(last), HTML, tokens);

  // Split into lines, carrying each token's colour across line breaks.
  const lines = [[]];
  tokens.forEach(([text, kind]) => {
    text.split("\n").forEach((piece, index) => {
      if (index > 0) lines.push([]);
      if (piece) lines[lines.length - 1].push([piece, kind]);
    });
  });
  return lines;
}

export default function CodeView({ code, c, label = "HTML" }) {
  const lines = useMemo(() => highlight(code || ""), [code]);
  const [copied, setCopied] = useState(false);
  return (
    <div className="eon-code-view" style={{ background: c.raised, color: c.text }}>
      <div className="eon-code-tools" style={{ background: c.panel, borderColor: c.border }}>
        <span style={{ color: c.muted }}>{label}</span>
        <button className="eon-buttonish" type="button" aria-label={copied ? "Copied" : "Copy code"} title="Copy code"
          onClick={async () => { await copyText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }}
          style={{ color: copied ? c.brand : c.secondary }}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <div className="eon-code-scroll">
        <ol className="eon-code-lines">
          {lines.map((line, index) => (
            <li key={index}>
              <span className="eon-code-ln" aria-hidden="true" style={{ color: c.muted }}>{index + 1}</span>
              <code>{line.length ? line.map(([text, kind], part) => <span key={part} className={kind ? `tok-${kind}` : undefined}>{text}</span>) : " "}</code>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
