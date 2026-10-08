import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { entryProblems, KB_TYPES, slugify, validateRefs } from "@kb/okf.js";
import { TOKEN_SETS } from "@kb/tokens.js";
import { BLOCK_NAMES } from "@kb/blocks.js";
import DocsArticle from "./DocsArticle";

const TYPE_HINT = {
  concept: "An idea or principle",
  howto: "Steps to get something done",
  reference: "Values to look up",
  decision: "A choice and its reasons",
  metric: "A number we track",
};

const toForm = (entry) => ({ ...entry, refsText: (entry.refs ?? []).join(", ") });
const fromForm = (form) => ({
  ...form,
  slug: form.slug.trim(),
  title: form.title.trim(),
  summary: form.summary.trim(),
  group_path: form.group_path.split("/").map((part) => part.trim()).filter(Boolean).join("/"),
  refs: form.refsText.split(",").map((ref) => ref.trim().replace(/^kb:/, "")).filter(Boolean),
  sort_order: Number(form.sort_order) || 0,
});

/* Edit or create one page: fields on the left, the rendered page on the right.
   Broken refs are warnings; shape problems block the save. */
export default function DocsEditor({ entry, entries, isNew, isAdmin, c, onSave, onDelete, onClose, onOpenPrompts }) {
  const [form, setForm] = useState(() => toForm(entry));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const draft = useMemo(() => fromForm(form), [form]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(fromForm(toForm(entry)));
  const problems = entryProblems(draft);
  if (isNew && entries.some((item) => item.slug === draft.slug)) problems.push(`A page already uses the slug "${draft.slug}".`);
  const refWarnings = validateRefs([...entries.filter((item) => item.slug !== entry.slug && item.slug !== draft.slug), draft])
    .filter((problem) => problem.from === draft.slug);

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (isNew && key === "title" && (!current.slug || current.slug === slugify(current.title))) next.slug = slugify(value);
      return next;
    });
  };

  const close = () => {
    if (dirty && !window.confirm("Discard your changes to this page?")) return;
    onClose();
  };

  const save = async () => {
    if (problems.length || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
    } catch (saveError) {
      setError(saveError?.message || "The page could not be saved.");
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); save(); }
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const field = { background: c.raised, color: c.text, borderColor: c.border };

  return (
    <div className="eon-docs-editor" role="dialog" aria-modal="true" aria-label={isNew ? "New page" : `Edit ${entry.title}`} style={{ background: c.bg, color: c.text }}>
      <header style={{ background: c.nav, borderColor: c.border }}>
        <strong>{isNew ? "New page" : `Edit ${entry.title}`}</strong>
        <div>
          {!isNew && isAdmin && entry.id && (
            <button className="eon-buttonish eon-docs-button" type="button" onClick={() => window.confirm(`Delete "${entry.title}" for everyone?`) && onDelete(entry)} style={{ color: c.muted }}>
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          )}
          <button className="eon-buttonish eon-docs-button" type="button" onClick={close} style={{ color: c.secondary }}>Cancel</button>
          <button className="eon-buttonish eon-docs-button is-primary" type="button" disabled={Boolean(problems.length) || saving || (!dirty && !isNew)} onClick={save} style={{ background: c.primary, color: c.primaryText }}>
            {saving ? "Saving…" : isNew ? "Create page" : "Save"}
          </button>
          <button className="eon-buttonish eon-icon-button" type="button" aria-label="Close editor" onClick={close} style={{ color: c.muted }}><X size={16} /></button>
        </div>
      </header>
      <div className="eon-docs-editor-body">
        <form className="eon-docs-editor-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <label>Title<input value={form.title} onChange={set("title")} style={field} autoFocus={isNew} /></label>
          <div className="eon-docs-editor-row">
            <label>Slug<input value={form.slug} onChange={set("slug")} style={field} disabled={!isNew} aria-describedby="kb-slug-hint" /></label>
            <label>Type
              <select value={form.type} onChange={set("type")} style={field}>
                {KB_TYPES.map((type) => <option key={type} value={type}>{type} · {TYPE_HINT[type]}</option>)}
              </select>
            </label>
          </div>
          <div className="eon-docs-editor-row">
            <label>Group<input value={form.group_path} onChange={set("group_path")} placeholder="Foundations" style={field} /></label>
            <label>Status
              <select value={form.status} onChange={set("status")} style={field}>
                <option value="published">Published</option>
                <option value="draft">Draft (hidden from the page list)</option>
              </select>
            </label>
            <label className="is-narrow">Order<input type="number" value={form.sort_order} onChange={set("sort_order")} style={field} /></label>
          </div>
          <label>Summary<input value={form.summary} onChange={set("summary")} placeholder="One sentence under the title" style={field} /></label>
          <label>Related pages<input value={form.refsText} onChange={set("refsText")} placeholder="spacing, color#state" style={field} /></label>
          <label className="is-grow">Page text (markdown)
            <textarea value={form.body_md} onChange={set("body_md")} spellCheck style={field} />
          </label>
          <p id="kb-slug-hint" className="eon-docs-editor-hint" style={{ color: c.muted }}>
            Link a page with <code>[text](kb:spacing#scale)</code>. Token tables: <code>```tokens:{Object.keys(TOKEN_SETS).join("|")}</code>. Blocks: <code>```eon:{BLOCK_NAMES.join("|")}</code>. Cmd+S saves.
          </p>
          {(problems.length > 0 || refWarnings.length > 0 || error) && (
            <ul className="eon-docs-editor-problems" role="status">
              {error && <li style={{ color: c.text }}><AlertTriangle size={13} aria-hidden="true" />{error}</li>}
              {problems.map((problem) => <li key={problem} style={{ color: c.text }}><AlertTriangle size={13} aria-hidden="true" />{problem}</li>)}
              {refWarnings.map((warning) => (
                <li key={warning.ref} style={{ color: c.secondary }}>
                  <AlertTriangle size={13} aria-hidden="true" />
                  {warning.problem === "missing-entry" ? `No page "${warning.ref.split("#")[0]}".` : `No section "${warning.ref.split("#")[1]}" on ${warning.ref.split("#")[0]}.`}
                </li>
              ))}
            </ul>
          )}
        </form>
        <section className="eon-docs-editor-preview" aria-label="Preview" style={{ borderColor: c.border }}>
          <h1>{draft.title || "Untitled"}</h1>
          {draft.summary && <p className="eon-docs-lead" style={{ color: c.secondary }}>{draft.summary}</p>}
          <DocsArticle entry={draft} c={c} onOpenRef={() => {}} onOpenRoute={() => {}} onOpenPrompts={onOpenPrompts} />
        </section>
      </div>
    </div>
  );
}
