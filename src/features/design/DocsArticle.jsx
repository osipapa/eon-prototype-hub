import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Link2 } from "lucide-react";
import { headings, parseRef } from "@kb/okf.js";
import { copyText } from "@/lib/uiState";
import GuideBlock from "./GuideBlocks";
import TokenTable from "./TokenTable";

const SAFE_URL = /^(kb:|#|https?:|mailto:|\/)/i;
const BLOCK_CLASS = /^language-(tokens|eon):([a-z0-9-]+)$/;

export function sectionLink(slug, id) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/design/${slug}${id ? `?s=${id}` : ""}`;
}

function CopyButton({ text, label, c, className }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`eon-buttonish ${className}`}
      type="button"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      onClick={() => copyText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); })}
      style={{ color: copied ? c.brand : c.muted }}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : className.includes("heading") ? <Link2 size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
  );
}

const textOf = (node) => (node?.type === "text" ? node.value : (node?.children ?? []).map(textOf).join(""));

/* One knowledge base page body: GitHub-flavored markdown, with token tables,
   interactive blocks, kb: links between pages, and linkable headings. */
export default function DocsArticle({ entry, c, onOpenRef, onOpenRoute, onOpenPrompts }) {
  const idByLine = useMemo(() => new Map(headings(entry.body_md).map((h) => [h.line, h.id])), [entry.body_md]);

  const Heading = (Tag) => function DocsHeading({ node, children }) {
    const id = idByLine.get(node?.position?.start?.line);
    return (
      <Tag id={id} className="eon-docs-heading">
        {children}
        {id && <CopyButton text={sectionLink(entry.slug, id)} label="Copy link to this section" c={c} className="eon-docs-heading-link" />}
      </Tag>
    );
  };

  const components = {
    h1: ({ children }) => <h2 className="eon-docs-heading">{children}</h2>,
    h2: Heading("h2"),
    h3: Heading("h3"),
    a({ href = "", children }) {
      if (href.startsWith("kb:")) {
        return <a href={sectionLink(...Object.values(parseRef(href)))} style={{ color: c.brand }} onClick={(event) => { event.preventDefault(); onOpenRef?.(href.slice(3)); }}>{children}</a>;
      }
      if (href.startsWith("#/")) {
        return <a href={href} style={{ color: c.brand }} onClick={(event) => { event.preventDefault(); onOpenRoute?.(href.slice(1)); }}>{children}</a>;
      }
      return <a href={href} target="_blank" rel="noreferrer" style={{ color: c.brand }}>{children}</a>;
    },
    pre({ node, children }) {
      const code = node?.children?.[0];
      const match = String(code?.properties?.className?.[0] ?? "").match(BLOCK_CLASS);
      if (match) {
        const arg = textOf(code).trim();
        return match[1] === "tokens"
          ? <TokenTable set={match[2]} c={c} />
          : <div className="eon-docs-block"><GuideBlock name={match[2]} arg={arg} c={c} onOpenPrompts={onOpenPrompts} /></div>;
      }
      return (
        <div className="eon-docs-pre" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
          <CopyButton text={textOf(code).replace(/\n$/, "")} label="Copy code" c={c} className="eon-docs-pre-copy" />
          <pre>{children}</pre>
        </div>
      );
    },
    code({ className, children }) {
      if (className) return <code className={className}>{children}</code>;
      return <code className="eon-docs-inline-code" style={{ background: c.raised, color: c.text }}>{children}</code>;
    },
    table: ({ children }) => <div className="eon-token-table-wrap" style={{ borderColor: c.border }}><table className="eon-token-table">{children}</table></div>,
    th: ({ children, style }) => <th style={{ ...style, borderColor: c.border }}>{children}</th>,
    td: ({ children, style }) => <td style={{ ...style, borderColor: c.border, color: c.secondary }}>{children}</td>,
    blockquote: ({ children }) => <blockquote style={{ borderColor: c.brand, background: c.panel }}>{children}</blockquote>,
    hr: () => <hr style={{ borderColor: c.border }} />,
  };

  return (
    <div className="eon-docs-body" style={{ "--docs-secondary": c.secondary, "--docs-text": c.text }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={(url) => (SAFE_URL.test(url) ? url : "")}>
        {entry.body_md}
      </ReactMarkdown>
    </div>
  );
}
