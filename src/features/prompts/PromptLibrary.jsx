import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, AlertTriangle, BookOpen, Check, ChevronDown, ChevronRight,
  Copy, Edit3, FileCode2, Info, Loader2, Menu, Moon, PanelLeftClose,
  Plus, Save, Search, Sun, Trash2, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DesignHubSwitcher from "@/components/DesignHubSwitcher";
import EonMark from "@/components/EonMark";
import { HubChangelogDialog, useHubChangelog } from "@/components/HubChangelog";
import HubSidebarFooter from "@/components/HubSidebarFooter";
import { HUB } from "@/features/hub/prototypes";
import { copyText, useStoredState } from "@/lib/uiState";
import {
  PROMPT_CATEGORIES, compilePrompt, missingRequiredVariables, promptVariableDefaults,
} from "./starterPrompts";

export default function PromptLibrary({
  prompts,
  assets = {},
  source = "shared",
  userEmail,
  isAdmin,
  currentUserId,
  activeSlug,
  onSelectPrompt,
  onOpenPrototypes,
  onOpenTracking,
  onOpenAdmin,
  onSignOut,
  onCreatePrompt,
  onUpdatePrompt,
  onDeletePrompt,
}) {
  const [hubTheme, setHubTheme] = useStoredState("eon-hub-theme", "dark");
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 900);
  const [valuesByPrompt, setValuesByPrompt] = useState({});
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const [editorPrompt, setEditorPrompt] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const changelog = useHubChangelog();
  const copiedTimer = useRef(null);
  const c = HUB[hubTheme];

  useEffect(() => {
    const update = () => {
      const nextNarrow = window.innerWidth <= 900;
      setNarrow(nextNarrow);
      if (!nextNarrow) setNavOpen(true);
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const activePrompt = prompts.find((prompt) => prompt.slug === activeSlug) || prompts[0] || null;
  const canCreate = source === "shared" && Boolean(onCreatePrompt);
  const canEdit = source === "shared" && Boolean(onUpdatePrompt);
  const canDelete = canEdit
    && Boolean(onDeletePrompt)
    && Boolean(activePrompt)
    && (isAdmin || activePrompt.created_by === currentUserId);
  const filteredPrompts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return prompts.filter((prompt) => {
      if (!needle) return true;
      return [
        prompt.title, prompt.summary, prompt.category, ...(prompt.tags || []),
      ].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [prompts, query]);

  const values = activePrompt
    ? { ...promptVariableDefaults(activePrompt), ...(valuesByPrompt[activePrompt.id] || {}) }
    : {};
  const missing = activePrompt ? missingRequiredVariables(activePrompt, values) : [];
  const readyPrompt = activePrompt ? compilePrompt(activePrompt, values) : "";

  const setVariable = (key, value) => {
    if (!activePrompt) return;
    setValuesByPrompt((current) => ({
      ...current,
      [activePrompt.id]: { ...(current[activePrompt.id] || {}), [key]: value },
    }));
  };

  const handleCopy = async (kind) => {
    if (!activePrompt || (kind === "ready" && missing.length)) return;
    setCopyError("");
    try {
      await copyText(kind === "ready" ? readyPrompt : activePrompt.prompt_body);
      setCopied(kind);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopyError("Clipboard access was blocked. Select the prompt text and copy it manually.");
    }
  };

  const selectPrompt = (prompt) => {
    onSelectPrompt?.(prompt);
    if (narrow) setNavOpen(false);
  };

  return (
    <div className={`${hubTheme === "dark" ? "" : "light"} eon-prompt-workspace`} style={{ background: c.bg, color: c.text }}>
      {narrow && navOpen && (
        <button
          className="eon-drawer-scrim"
          type="button"
          aria-label="Close prompt navigation"
          onClick={() => setNavOpen(false)}
        />
      )}

      {navOpen && (
        <PromptSidebar
          c={c}
          logo={assets.eonLogo}
          prompts={prompts}
          query={query}
          setQuery={setQuery}
          filteredPrompts={filteredPrompts}
          activePrompt={activePrompt}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onSelectPrompt={selectPrompt}
          onOpenPrototypes={onOpenPrototypes}
          onOpenTracking={onOpenTracking}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
          changelog={changelog}
          onNewPrompt={canCreate ? () => setEditorPrompt(newPromptDraft()) : undefined}
          isDrawer={narrow}
          onClose={() => setNavOpen(false)}
        />
      )}

      <main className="eon-prompt-main">
        <header className="eon-prompt-toolbar" style={{ background: c.nav, borderColor: c.border }}>
          <button
            className="eon-buttonish eon-icon-button"
            type="button"
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? "Collapse prompt navigation" : "Open prompt navigation"}
            aria-pressed={navOpen}
            style={{ color: c.muted, boxShadow: hubShadow(c) }}
          >
            {navOpen ? <PanelLeftClose size={16} /> : <Menu size={17} />}
          </button>
          <div className="eon-prompt-breadcrumbs" aria-label="Current prompt">
            <span style={{ color: c.muted }}>Prompts</span>
            {activePrompt && (
              <>
                <ChevronRight size={13} aria-hidden="true" style={{ color: c.muted }} />
                <strong>{activePrompt.title}</strong>
              </>
            )}
          </div>
          <div className="eon-prompt-toolbar-spacer" />
          <button
            className="eon-buttonish eon-icon-button"
            type="button"
            onClick={() => setHubTheme(hubTheme === "dark" ? "light" : "dark")}
            aria-label={`Switch hub interface to ${hubTheme === "dark" ? "light" : "dark"} theme`}
            title="Hub interface theme"
            style={{ color: c.muted, boxShadow: hubShadow(c) }}
          >
            {hubTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        {source === "starter" && (
          <div className="eon-prompt-source-note" role="status" style={{ background: c.panel, borderColor: c.border, color: c.secondary }}>
            <Info size={15} aria-hidden="true" />
            <span><strong style={{ color: c.text }}>Starter library.</strong> Shared prompt storage is not available yet, so these bundled prompts are read-only.</span>
          </div>
        )}

        {activePrompt ? (
          <div className="eon-prompt-scroll">
            <div className="eon-prompt-layout">
              <PromptArticle
                c={c}
                prompt={activePrompt}
                copied={copied}
                onCopyTemplate={() => handleCopy("template")}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={() => setEditorPrompt(activePrompt)}
                onDelete={() => setDeleteCandidate(activePrompt)}
              />
              <PromptUseRail
                c={c}
                prompt={activePrompt}
                values={values}
                setVariable={setVariable}
                missing={missing}
                copied={copied}
                copyError={copyError}
                onCopyReady={() => handleCopy("ready")}
                onCopyTemplate={() => handleCopy("template")}
              />
            </div>
          </div>
        ) : (
          <div className="eon-prompt-empty" style={{ color: c.muted }}>
            <span style={{ background: c.panel, color: c.brand }}><BookOpen size={21} /></span>
            <h1 style={{ color: c.text }}>No prompts yet</h1>
            <p>Create the first reusable prompt for your team.</p>
            {canCreate && (
              <button
                className="eon-buttonish eon-prompt-empty-create"
                type="button"
                onClick={() => setEditorPrompt(newPromptDraft())}
                style={{ background: c.primary, color: c.primaryText }}
              >
                <Plus size={15} />
                New prompt
              </button>
            )}
          </div>
        )}
      </main>

      {editorPrompt && (
        <PromptEditorModal
          c={c}
          prompt={editorPrompt}
          onClose={() => setEditorPrompt(null)}
          onSave={(patch) => editorPrompt.id
            ? onUpdatePrompt(editorPrompt, patch)
            : onCreatePrompt(patch)}
        />
      )}
      {deleteCandidate && (
        <PromptDeleteModal
          c={c}
          prompt={deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          onDelete={() => onDeletePrompt(deleteCandidate)}
        />
      )}
      <HubChangelogDialog c={c} open={changelog.isOpen} onClose={changelog.close} />
    </div>
  );
}

function PromptSidebar({
  c,
  logo,
  prompts,
  query,
  setQuery,
  filteredPrompts,
  activePrompt,
  userEmail,
  isAdmin,
  onSelectPrompt,
  onOpenPrototypes,
  onOpenTracking,
  onOpenAdmin,
  onSignOut,
  changelog,
  onNewPrompt,
  isDrawer,
  onClose,
}) {
  const [collapsedTopics, setCollapsedTopics] = useState({});
  const groupedPrompts = useMemo(() => {
    const byCategory = {};
    filteredPrompts.forEach((prompt) => {
      const category = prompt.category || "General";
      (byCategory[category] ||= []).push(prompt);
    });
    const configuredOrder = new Map(PROMPT_CATEGORIES.map((category, index) => [category, index]));
    return Object.entries(byCategory).sort(([left], [right]) => {
      const leftIndex = configuredOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = configuredOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || left.localeCompare(right);
    });
  }, [filteredPrompts]);

  return (
    <aside
      className="eon-prompt-sidebar"
      role={isDrawer ? "dialog" : "navigation"}
      aria-modal={isDrawer || undefined}
      aria-label="Prompt Library navigation"
      style={{ background: c.nav, borderColor: c.border }}
    >
      <div className="eon-prompt-sidebar-head" style={{ borderColor: c.border }}>
        <div className="eon-brand-row">
          <div className="eon-brand" style={{ color: c.text }}>
            <EonMark src={logo} />
            <span>Eon Design Hub</span>
          </div>
          {isDrawer && (
            <button className="eon-buttonish eon-icon-button" type="button" onClick={onClose} aria-label="Close prompt navigation" style={{ color: c.muted }}>
              <X size={17} />
            </button>
          )}
        </div>
        <DesignHubSwitcher
          active="prompts"
          c={c}
          onSelect={(product) => {
            if (product === "prototypes") onOpenPrototypes?.();
            if (product === "tracking") onOpenTracking?.();
          }}
        />
        <div className="eon-prompt-search">
          <Search size={15} aria-hidden="true" style={{ color: c.muted }} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search prompts"
            aria-label="Search prompts"
            style={{ background: c.raised, borderColor: c.border, color: c.text }}
          />
        </div>
        {onNewPrompt && (
          <button
            className="eon-buttonish eon-prompt-new-button"
            type="button"
            onClick={() => {
              onNewPrompt();
              if (isDrawer) onClose();
            }}
            style={{ background: c.primary, color: c.primaryText }}
          >
            <Plus size={15} aria-hidden="true" />
            New prompt
          </button>
        )}
      </div>

      <div className="eon-prompt-sidebar-scroll">
        <section className="eon-prompt-library-nav" aria-labelledby="eon-prompt-library-title">
          <div className="eon-prompt-nav-label" id="eon-prompt-library-title" style={{ color: c.muted }}>
            Prompts <span>{prompts.length}</span>
          </div>
          {groupedPrompts.length ? groupedPrompts.map(([category, items]) => {
            const collapsed = !query.trim() && Boolean(collapsedTopics[category]);
            return (
              <div className="eon-prompt-topic-group" key={category}>
                <div className="eon-group-label-row">
                  <button
                    className="eon-buttonish eon-group-toggle"
                    type="button"
                    onClick={() => setCollapsedTopics((current) => ({
                      ...current,
                      [category]: !current[category],
                    }))}
                    aria-expanded={!collapsed}
                    style={{ color: c.muted }}
                  >
                    <ChevronDown size={13} className={collapsed ? "is-collapsed" : ""} />
                    {category}
                  </button>
                </div>
                {!collapsed && items.map((prompt) => {
                  const selected = prompt.id === activePrompt?.id;
                  return (
                    <button
                      className="eon-buttonish eon-prompt-nav-item"
                      key={prompt.id}
                      type="button"
                      onClick={() => onSelectPrompt(prompt)}
                      aria-current={selected ? "page" : undefined}
                      style={{ background: selected ? c.active : "transparent", color: selected ? c.text : c.secondary }}
                    >
                      <FileCode2 size={14} aria-hidden="true" style={{ color: selected ? c.brand : c.muted }} />
                      <span>{prompt.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          }) : (
            <div className="eon-prompt-nav-empty" style={{ color: c.muted }}>
              <Search size={16} />
              <span>No prompts found.</span>
            </div>
          )}
        </section>
      </div>

      <HubSidebarFooter
        c={c}
        userEmail={userEmail}
        isAdmin={isAdmin}
        onOpenAdmin={onOpenAdmin}
        onSignOut={onSignOut}
        changelog={changelog}
      />
    </aside>
  );
}

function PromptArticle({
  c, prompt, copied, onCopyTemplate, canEdit, canDelete, onEdit, onDelete,
}) {
  return (
    <article className="eon-prompt-article">
      <header className="eon-prompt-hero">
        <h1>{prompt.title}</h1>
        {canEdit && (
          <div className="eon-prompt-hero-actions">
            <button
              className="eon-buttonish eon-prompt-manage-button"
              type="button"
              onClick={onEdit}
              style={{ background: c.panel, color: c.secondary, boxShadow: hubShadow(c) }}
            >
              <Edit3 size={14} aria-hidden="true" />
              Edit prompt
            </button>
            {canDelete && (
              <button
                className="eon-buttonish eon-prompt-manage-button eon-prompt-delete-button"
                type="button"
                onClick={onDelete}
                style={{ background: c.panel, color: "#D98295", boxShadow: hubShadow(c) }}
              >
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </button>
            )}
          </div>
        )}
      </header>

      <section className="eon-prompt-doc-section" aria-labelledby="eon-prompt-template-title">
        <div className="eon-prompt-section-head">
          <h2 id="eon-prompt-template-title">Prompt</h2>
          <button
            className="eon-buttonish eon-secondary-button"
            type="button"
            onClick={onCopyTemplate}
            style={{ background: c.panel, color: copied === "template" ? c.brand : c.secondary, borderColor: c.border }}
          >
            <CopyGlyph copied={copied === "template"} />
            <span>{copied === "template" ? "Copied" : "Copy template"}</span>
          </button>
        </div>
        <PromptCode c={c} body={prompt.prompt_body} />
      </section>

    </article>
  );
}

function PromptEditorModal({ c, prompt, onClose, onSave }) {
  const isNew = !prompt.id;
  const firstFieldRef = useRef(null);
  const [draft, setDraft] = useState(() => ({
    title: prompt.title || "",
    category: prompt.category || "General",
    prompt_body: prompt.prompt_body || "",
  }));
  const [variableMap, setVariableMap] = useState(() => Object.fromEntries(
    (prompt.variables || []).map((variable) => [variable.key, { ...variable }]),
  ));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const variableKeys = useMemo(() => promptTokens(draft.prompt_body), [draft.prompt_body]);

  useEffect(() => {
    const previous = document.activeElement;
    firstFieldRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previous?.focus?.();
    };
  }, [busy, onClose]);

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const variableFor = (key) => variableMap[key] || {
    key,
    label: humanizeKey(key),
    description: "",
    required: true,
    default: "",
    example: "",
  };
  const setVariableField = (key, field, value) => {
    setVariableMap((current) => ({
      ...current,
      [key]: { ...variableFor(key), [field]: value },
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.prompt_body.trim()) {
      setError("Title and prompt template are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({
        title: draft.title.trim(),
        category: draft.category.trim() || "General",
        prompt_body: draft.prompt_body.trim(),
        variables: variableKeys.map((key) => {
          const variable = variableFor(key);
          return {
            key,
            label: String(variable.label || humanizeKey(key)).trim(),
            description: String(variable.description || "").trim(),
            required: Boolean(variable.required),
            default: String(variable.default || "").trim(),
            example: String(variable.example || "").trim(),
          };
        }),
      });
      onClose();
    } catch (saveError) {
      setError(saveError?.message || "The prompt could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <form
        className="eon-modal eon-prompt-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="eon-prompt-editor-title"
        onSubmit={submit}
        style={{ background: c.panel, borderColor: c.border, color: c.text }}
      >
        <div className="eon-modal-head" style={{ borderColor: c.border }}>
          <div className="eon-prompt-editor-heading">
            <span style={{ background: c.active, color: c.brand }}>
              {isNew ? <Plus size={16} /> : <Edit3 size={15} />}
            </span>
            <strong id="eon-prompt-editor-title">{isNew ? "New prompt" : "Edit prompt"}</strong>
          </div>
          <button
            className="eon-buttonish eon-icon-button"
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close prompt editor"
            style={{ color: c.muted }}
          >
            <X size={17} />
          </button>
        </div>

        <div className="eon-modal-body eon-prompt-editor-body">
          <div className="eon-prompt-editor-grid">
            <EditorField label="Title" required>
              <Input ref={firstFieldRef} value={draft.title} onChange={(event) => setField("title", event.target.value)} style={editorControl(c)} />
            </EditorField>
            <EditorField label="Category">
              <select value={draft.category} onChange={(event) => setField("category", event.target.value)} style={editorControl(c)}>
                {[...new Set([...PROMPT_CATEGORIES, draft.category])].map((item) => <option key={item}>{item}</option>)}
              </select>
            </EditorField>
          </div>

          <EditorField label="Prompt" required>
            <Textarea
              className="eon-prompt-template-editor"
              value={draft.prompt_body}
              onChange={(event) => setField("prompt_body", event.target.value)}
              placeholder="Use {{name}} for a fillable input"
              style={editorControl(c)}
            />
          </EditorField>

          <section className="eon-prompt-editor-variables" aria-labelledby="eon-prompt-editor-variables-title">
            <div>
              <strong id="eon-prompt-editor-variables-title">Template inputs</strong>
              <span style={{ color: c.muted }}>{variableKeys.length}</span>
            </div>
            {variableKeys.length ? variableKeys.map((key) => {
              const variable = variableFor(key);
              return (
                <div className="eon-prompt-editor-variable" key={key} style={{ background: c.raised, borderColor: c.border }}>
                  <code style={{ color: c.brand }}>{`{{${key}}}`}</code>
                  <div className="eon-prompt-variable-edit-grid">
                    <EditorField label="Label">
                      <Input value={variable.label || ""} onChange={(event) => setVariableField(key, "label", event.target.value)} style={editorControl(c)} />
                    </EditorField>
                    <label className="eon-prompt-variable-required" style={{ color: c.secondary }}>
                      <input type="checkbox" checked={Boolean(variable.required)} onChange={(event) => setVariableField(key, "required", event.target.checked)} />
                      Required
                    </label>
                  </div>
                </div>
              );
            }) : (
              <div className="eon-prompt-editor-no-variables" style={{ background: c.raised, color: c.muted }}>
                This template has no fillable inputs.
              </div>
            )}
          </section>

          {error && <div className="eon-prompt-editor-error" role="alert"><AlertCircle size={14} />{error}</div>}
        </div>

        <div className="eon-modal-foot" style={{ borderColor: c.border }}>
          <span className="eon-prompt-editor-spacer" />
          <button className="eon-buttonish eon-prompt-editor-cancel" type="button" onClick={onClose} disabled={busy} style={{ color: c.secondary, borderColor: c.border }}>
            Cancel
          </button>
          <button className="eon-buttonish eon-prompt-editor-save" type="submit" disabled={busy} style={{ background: c.primary, color: c.primaryText }}>
            {busy ? <Loader2 className="eon-spin" size={15} /> : isNew ? <Plus size={15} /> : <Save size={15} />}
            {busy ? "Saving…" : isNew ? "Create prompt" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PromptDeleteModal({ c, prompt, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await onDelete();
      onClose();
    } catch (deleteError) {
      setError(deleteError?.message || "The prompt could not be deleted. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div
        className="eon-modal eon-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="eon-delete-prompt-title"
        aria-describedby="eon-delete-prompt-body"
        style={{ background: c.panel, borderColor: c.border }}
      >
        <div className="eon-confirm-icon" style={{ background: "rgba(217,130,149,.1)", color: "#D98295" }}><AlertTriangle size={18} /></div>
        <h2 id="eon-delete-prompt-title">Delete this prompt?</h2>
        <p id="eon-delete-prompt-body" style={{ color: c.secondary }}>
          <strong style={{ color: c.text }}>{prompt.title}</strong> will be removed for everyone on the team.
        </p>
        {error && <div className="eon-prompt-editor-error" role="alert"><AlertCircle size={14} />{error}</div>}
        <div className="eon-confirm-actions">
          <button className="eon-buttonish eon-prompt-editor-cancel" type="button" onClick={onClose} disabled={busy} style={{ color: c.secondary, borderColor: c.border }}>
            Keep prompt
          </button>
          <button className="eon-buttonish eon-prompt-delete-confirm" type="button" onClick={remove} disabled={busy}>
            {busy ? <Loader2 className="eon-spin" size={15} /> : <Trash2 size={15} />}
            {busy ? "Deleting…" : "Delete prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorField({ label, hint, required, children }) {
  return (
    <label className="eon-prompt-editor-field">
      <span>
        <strong>{label}</strong>
        {required && <em aria-label="Required">*</em>}
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </label>
  );
}

function PromptUseRail({
  c,
  prompt,
  values,
  setVariable,
  missing,
  copied,
  copyError,
  onCopyReady,
  onCopyTemplate,
}) {
  return (
    <aside className="eon-prompt-use-rail" aria-label="Use this prompt">
      <div className="eon-prompt-use-card" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
        <div className="eon-prompt-use-head">
          <h2>Fill & copy</h2>
        </div>

        <div className="eon-prompt-variables">
          {(prompt.variables || []).map((variable) => {
            const longField = /(material|constraints|behavior|context|source|dependencies|outcome|goal)/i.test(variable.key)
              && String(variable.example || variable.default || "").length > 44;
            const fieldStyle = {
              background: c.bg,
              borderColor: c.border,
              color: c.text,
            };
            return (
              <label className="eon-prompt-variable" key={variable.key}>
                <span>
                  <strong style={{ color: c.text }}>
                    {variable.label}{variable.required && <span className="eon-required-star" aria-hidden="true"> *</span>}
                  </strong>
                </span>
                {longField ? (
                  <Textarea
                    value={values[variable.key] || ""}
                    onChange={(event) => setVariable(variable.key, event.target.value)}
                    placeholder={variable.example || ""}
                    aria-label={variable.label}
                    aria-required={variable.required}
                    style={fieldStyle}
                  />
                ) : (
                  <Input
                    value={values[variable.key] || ""}
                    onChange={(event) => setVariable(variable.key, event.target.value)}
                    placeholder={variable.example || ""}
                    aria-label={variable.label}
                    aria-required={variable.required}
                    style={fieldStyle}
                  />
                )}
              </label>
            );
          })}
        </div>

        {missing.length > 0 && (
          <div className="eon-prompt-missing" style={{ color: c.muted }}>
            <AlertCircle size={14} aria-hidden="true" />
            <span>{missing.length} required {missing.length === 1 ? "field" : "fields"} left</span>
          </div>
        )}
        {copyError && <div className="eon-prompt-copy-error" role="alert">{copyError}</div>}

        <button
          className="eon-buttonish eon-prompt-copy-primary"
          type="button"
          onClick={onCopyReady}
          disabled={missing.length > 0}
          style={{ background: c.primary, color: c.primaryText }}
        >
          <CopyGlyph copied={copied === "ready"} />
          <span>{copied === "ready" ? "Ready prompt copied" : "Copy ready prompt"}</span>
        </button>
        <button
          className="eon-buttonish eon-prompt-copy-secondary"
          type="button"
          onClick={onCopyTemplate}
          style={{ borderColor: c.border, color: copied === "template" ? c.brand : c.secondary }}
        >
          <CopyGlyph copied={copied === "template"} />
          <span>{copied === "template" ? "Template copied" : "Copy template"}</span>
        </button>
      </div>
    </aside>
  );
}

function PromptCode({ c, body }) {
  const tokens = String(body || "").split(/(\{\{\s*[a-zA-Z0-9_-]+\s*\}\})/g);
  return (
    <pre className="eon-prompt-code" style={{ background: c.panel, boxShadow: hubShadow(c), color: c.secondary }}>
      <code>
        {tokens.map((token, index) => /^\{\{/.test(token)
          ? <mark key={`${token}-${index}`} style={{ background: "transparent", color: c.brand }}>{token}</mark>
          : token)}
      </code>
    </pre>
  );
}

function CopyGlyph({ copied }) {
  return (
    <span className="eon-copy-glyph" aria-hidden="true">
      <Check className={copied ? "is-visible" : ""} size={15} />
      <Copy className={copied ? "" : "is-visible"} size={15} />
    </span>
  );
}

function hubShadow(c) {
  return c.bg === "#000000"
    ? "0 0 0 1px rgba(255,255,255,.08)"
    : "0 0 0 1px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.05)";
}

function promptTokens(body) {
  return [...new Set(
    [...String(body || "").matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g)].map((match) => match[1]),
  )];
}

function humanizeKey(key) {
  const value = String(key || "").replace(/[_-]+/g, " ").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Input";
}

function editorControl(c) {
  return { background: c.bg, borderColor: c.border, color: c.text };
}

function newPromptDraft() {
  return {
    id: null,
    title: "",
    category: "UI & interaction",
    prompt_body: "",
    variables: [],
    version: 1,
  };
}
