import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, AlertTriangle, BookOpen, Check, ChevronDown, ChevronRight,
  Copy, Edit3, FolderCog, FolderPlus, Loader2, Menu, MoreHorizontal,
  Pencil, Plus, Save, Search, Trash2, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DesignHubSwitcher from "@/components/DesignHubSwitcher";
import { HubChangelogDialog, useHubChangelog } from "@/components/HubChangelog";
import HubSidebarFooter from "@/components/HubSidebarFooter";
import SidebarResizeHandle, { useResizableSidebar } from "@/components/SidebarResizeHandle";
import { HUB } from "@/features/hub/prototypes";
import { useSystemTheme } from "@/lib/systemTheme";
import { copyText } from "@/lib/uiState";
import {
  compilePrompt, missingRequiredVariables, promptVariableDefaults,
} from "./starterPrompts";

export default function PromptLibrary({
  prompts,
  categories = [],
  assets = {},
  source = "shared",
  userEmail,
  isAdmin,
  currentUserId,
  activeSlug,
  onSelectPrompt,
  onOpenDesign,
  onOpenPrototypes,
  onOpenTracking,
  onOpenAdmin,
  onSignOut,
  onCreatePrompt,
  onUpdatePrompt,
  onDeletePrompt,
  onCreateCategory,
  onDeleteCategory,
}) {
  const hubTheme = useSystemTheme();
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 900);
  const [valuesByPrompt, setValuesByPrompt] = useState({});
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const [editorPrompt, setEditorPrompt] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryDeleteCandidate, setCategoryDeleteCandidate] = useState(null);
  const changelog = useHubChangelog();
  const sidebarResize = useResizableSidebar("eon-sidebar-width");
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
  const canManageCategories = source === "shared"
    && Boolean(onCreateCategory)
    && Boolean(onDeleteCategory);
  const canDeletePrompt = (prompt) => source === "shared"
    && Boolean(onDeletePrompt)
    && Boolean(prompt)
    && (isAdmin || prompt.created_by === currentUserId);
  const canDelete = canDeletePrompt(activePrompt);
  const categoryDeleteFallback = categoryDeleteCandidate
    ? categories.find((category) => (
      category.id !== categoryDeleteCandidate.category.id
      && category.name.toLowerCase() === "general"
    )) || categories.find((category) => category.id !== categoryDeleteCandidate.category.id) || null
    : null;
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
    if (!activePrompt) return;
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
          categories={categories}
          query={query}
          setQuery={setQuery}
          filteredPrompts={filteredPrompts}
          activePrompt={activePrompt}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onSelectPrompt={selectPrompt}
          onOpenDesign={onOpenDesign}
          onOpenPrototypes={onOpenPrototypes}
          onOpenTracking={onOpenTracking}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
          changelog={changelog}
          resize={sidebarResize}
          onNewPrompt={canCreate ? () => setEditorPrompt(newPromptDraft(categories)) : undefined}
          onRequestEditPrompt={canEdit ? (prompt) => setEditorPrompt(prompt) : undefined}
          onManageCategories={canManageCategories ? () => setCategoryManagerOpen(true) : undefined}
          onRequestDeleteCategory={canManageCategories ? (category) => {
            setCategoryDeleteCandidate({ category, returnToManager: false });
          } : undefined}
          onRequestDeletePrompt={source === "shared" && onDeletePrompt
            ? (prompt, restoreFocus) => setDeleteCandidate({ prompt, restoreFocus })
            : undefined}
          canDeletePrompt={canDeletePrompt}
          isDrawer={narrow}
          onClose={() => setNavOpen(false)}
        />
      )}

      <main className="eon-prompt-main">
        <header className="eon-prompt-toolbar" style={{ background: c.nav, borderColor: c.border }}>
          {narrow && !navOpen && (
            <button
              className="eon-buttonish eon-icon-button"
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open prompt navigation"
              style={{ color: c.muted, boxShadow: hubShadow(c) }}
            >
              <Menu size={17} />
            </button>
          )}
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
        </header>

        {activePrompt ? (
          <div className="eon-prompt-scroll">
            <div className={`eon-prompt-layout${activePrompt.variables?.length ? "" : " is-single"}`}>
              <PromptArticle
                c={c}
                prompt={activePrompt}
                body={readyPrompt}
                copied={copied}
                copyError={copyError}
                onCopy={() => handleCopy("ready")}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={() => setEditorPrompt(activePrompt)}
                onDelete={() => setDeleteCandidate({ prompt: activePrompt, restoreFocus: document.activeElement })}
              />
              {activePrompt.variables?.length > 0 && (
                <PromptUseRail
                  c={c}
                  prompt={activePrompt}
                  values={values}
                  setVariable={setVariable}
                  missing={missing}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="eon-prompt-empty" style={{ color: c.muted }}>
            <span className="eon-accent-icon" style={{ background: c.panel, color: c.brand }}><BookOpen size={21} /></span>
            <h1 style={{ color: c.text }}>No prompts yet</h1>
            <p>Create the first reusable prompt for your team.</p>
            {canCreate && (
              <button
                className="eon-buttonish eon-prompt-empty-create"
                type="button"
                onClick={() => setEditorPrompt(newPromptDraft(categories))}
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
          categories={categories}
          onClose={() => setEditorPrompt(null)}
          onSave={(patch) => editorPrompt.id
            ? onUpdatePrompt(editorPrompt, patch)
            : onCreatePrompt(patch)}
        />
      )}
      {deleteCandidate && (
        <PromptDeleteModal
          c={c}
          prompt={deleteCandidate.prompt}
          restoreFocus={deleteCandidate.restoreFocus}
          onClose={() => setDeleteCandidate(null)}
          onDelete={() => onDeletePrompt(deleteCandidate.prompt)}
        />
      )}
      {categoryManagerOpen && (
        <CategoryManagerModal
          c={c}
          categories={categories}
          prompts={prompts}
          onClose={() => setCategoryManagerOpen(false)}
          onCreate={onCreateCategory}
          onRequestDelete={(category) => {
            setCategoryManagerOpen(false);
            setCategoryDeleteCandidate({ category, returnToManager: true });
          }}
        />
      )}
      {categoryDeleteCandidate && (
        <CategoryDeleteModal
          c={c}
          category={categoryDeleteCandidate.category}
          promptCount={prompts.filter((prompt) => prompt.category === categoryDeleteCandidate.category.name).length}
          fallbackCategoryName={categoryDeleteFallback?.name}
          onClose={() => {
            if (categoryDeleteCandidate.returnToManager) setCategoryManagerOpen(true);
            setCategoryDeleteCandidate(null);
          }}
          onDelete={() => onDeleteCategory(categoryDeleteCandidate.category, categoryDeleteFallback)}
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
  categories,
  query,
  setQuery,
  filteredPrompts,
  activePrompt,
  userEmail,
  isAdmin,
  onSelectPrompt,
  onOpenDesign,
  onOpenPrototypes,
  onOpenTracking,
  onOpenAdmin,
  onSignOut,
  changelog,
  resize,
  onNewPrompt,
  onRequestEditPrompt,
  onManageCategories,
  onRequestDeleteCategory,
  onRequestDeletePrompt,
  canDeletePrompt,
  isDrawer,
  onClose,
}) {
  const [collapsedTopics, setCollapsedTopics] = useState({});
  const [promptMenuId, setPromptMenuId] = useState(null);
  const groupedPrompts = useMemo(() => {
    const byCategory = Object.create(null);
    if (!query.trim()) {
      categories.forEach((category) => { byCategory[category.name] = []; });
    }
    filteredPrompts.forEach((prompt) => {
      const category = prompt.category || "General";
      (byCategory[category] ||= []).push(prompt);
    });
    const configuredOrder = new Map(categories.map((category, index) => [category.name, index]));
    return Object.entries(byCategory).sort(([left], [right]) => {
      const leftIndex = configuredOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = configuredOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || left.localeCompare(right);
    });
  }, [categories, filteredPrompts, query]);

  useEffect(() => {
    if (!promptMenuId) return undefined;
    const close = (event) => {
      if (event.key === "Escape") setPromptMenuId(null);
      if (event.type === "mousedown" && !event.target.closest(`[data-prompt-menu="${promptMenuId}"]`)) setPromptMenuId(null);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("mousedown", close);
    };
  }, [promptMenuId]);

  return (
    <aside
      className="eon-prompt-sidebar"
      role={isDrawer ? "dialog" : "navigation"}
      aria-modal={isDrawer || undefined}
      aria-label="Prompt Library navigation"
      style={{
        background: c.nav,
        borderColor: c.border,
        ...(!isDrawer ? { width: resize.width, flexBasis: resize.width } : {}),
      }}
    >
      {!isDrawer && <SidebarResizeHandle resize={resize} label="Resize prompt navigation" />}
      <div className="eon-prompt-sidebar-head" style={{ borderColor: c.border }}>
        <div className="eon-brand-row">
          <DesignHubSwitcher
            active="prompts"
            c={c}
            logo={logo}
            onSelect={(product) => {
              if (product === "design") onOpenDesign?.();
              if (product === "prototypes") onOpenPrototypes?.();
              if (product === "tracking") onOpenTracking?.();
            }}
          />
          {isDrawer && (
            <button className="eon-buttonish eon-icon-button" type="button" onClick={onClose} aria-label="Close prompt navigation" style={{ color: c.muted }}>
              <X size={17} />
            </button>
          )}
        </div>
        <div className="eon-sidebar-library-heading">
          <div>
            <span style={{ color: c.muted }}>Library</span>
            <strong>Prompts</strong>
          </div>
          <Badge variant="secondary" style={{ background: c.raised, color: c.secondary }}>{filteredPrompts.length}</Badge>
        </div>
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
        {(onNewPrompt || onManageCategories) && (
          <div className="eon-prompt-actions">
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
            {onManageCategories && (
              <button
                className="eon-buttonish eon-prompt-category-button"
                type="button"
                onClick={() => {
                  onManageCategories();
                  if (isDrawer) onClose();
                }}
                style={{ background: "transparent", color: c.secondary, boxShadow: hubShadow(c) }}
              >
                <FolderCog size={15} aria-hidden="true" />
                Categories
              </button>
            )}
          </div>
        )}
      </div>

      <div className="eon-prompt-sidebar-scroll">
        <section className="eon-prompt-library-nav" aria-labelledby="eon-prompt-library-title">
          <div className="eon-prompt-nav-label" id="eon-prompt-library-title" style={{ color: c.muted }}>
            Prompts <span>{prompts.length}</span>
          </div>
          {groupedPrompts.length ? groupedPrompts.map(([category, items]) => {
            const collapsed = !query.trim() && Boolean(collapsedTopics[category]);
            const categoryRecord = categories.find((item) => item.name === category);
            const canDeleteCategory = Boolean(onRequestDeleteCategory)
              && Boolean(categoryRecord?.id);
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
                  {canDeleteCategory && (
                    <button
                      className="eon-buttonish eon-prompt-category-inline-delete"
                      type="button"
                      onClick={() => onRequestDeleteCategory(categoryRecord)}
                      aria-label={`Delete ${category} category`}
                      title={`Delete ${category}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {!collapsed && items.map((prompt) => {
                  const selected = prompt.id === activePrompt?.id;
                  return (
                    <div className="eon-prompt-nav-row" key={prompt.id} data-prompt-menu={prompt.id}>
                      <button
                        className="eon-buttonish eon-prompt-nav-item"
                        type="button"
                        onClick={() => onSelectPrompt(prompt)}
                        aria-current={selected ? "page" : undefined}
                        style={{ background: selected ? c.active : "transparent", color: selected ? c.text : c.secondary }}
                      >
                        <span>{prompt.title}</span>
                      </button>
                      {(onRequestEditPrompt || (onRequestDeletePrompt && canDeletePrompt(prompt))) && (
                        <div className="eon-prompt-row-actions">
                          <button
                            className="eon-buttonish eon-icon-button"
                            type="button"
                            onClick={() => setPromptMenuId((current) => current === prompt.id ? null : prompt.id)}
                            aria-label={`Actions for ${prompt.title}`}
                            aria-expanded={promptMenuId === prompt.id}
                            style={{ color: c.muted }}
                          >
                            <MoreHorizontal size={16} aria-hidden="true" />
                          </button>
                          {promptMenuId === prompt.id && (
                            <div className="eon-story-menu" role="menu" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
                              {onRequestEditPrompt && (
                                <button className="eon-buttonish" type="button" role="menuitem" onClick={() => { setPromptMenuId(null); onRequestEditPrompt(prompt); }} style={{ color: c.text }}>
                                  <Pencil size={14} aria-hidden="true" /> Edit
                                </button>
                              )}
                              {onRequestDeletePrompt && canDeletePrompt(prompt) && (
                                <button className="eon-buttonish" type="button" role="menuitem" onClick={(event) => {
                                  const restoreFocus = event.currentTarget.closest("[data-prompt-menu]")?.querySelector('button[aria-label^="Actions for"]');
                                  setPromptMenuId(null);
                                  onRequestDeletePrompt(prompt, restoreFocus);
                                }} style={{ color: "#D98295" }}>
                                  <Trash2 size={14} aria-hidden="true" /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
  c, prompt, body, copied, copyError, onCopy, canEdit, canDelete, onEdit, onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.type === "mousedown" && !actionsRef.current?.contains(event.target)) setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("mousedown", close);
    };
  }, [menuOpen]);

  return (
    <article className="eon-prompt-article">
      <header className="eon-prompt-hero">
        <h1>{prompt.title}</h1>
        {(canEdit || canDelete) && (
          <div className="eon-prompt-hero-actions" ref={actionsRef}>
            <button
              className="eon-buttonish eon-icon-button"
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={`Actions for ${prompt.title}`}
              aria-expanded={menuOpen}
              style={{ background: c.panel, color: c.secondary, boxShadow: hubShadow(c) }}
            >
              <MoreHorizontal size={17} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="eon-story-menu" role="menu" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
                {canEdit && <button className="eon-buttonish" type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }} style={{ color: c.text }}><Pencil size={14} /> Edit</button>}
                {canDelete && <button className="eon-buttonish" type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }} style={{ color: "#D98295" }}><Trash2 size={14} /> Delete</button>}
              </div>
            )}
          </div>
        )}
      </header>

      <section className="eon-prompt-doc-section" aria-label="Live prompt preview">
        <div className="eon-prompt-code-shell">
          <button
            className="eon-buttonish eon-prompt-code-copy"
            type="button"
            onClick={onCopy}
            aria-label={copied === "ready" ? "Prompt copied" : "Copy prompt"}
            title={copied === "ready" ? "Copied" : "Copy prompt"}
            style={{ background: c.raised, color: copied === "ready" ? c.brand : c.secondary, boxShadow: hubShadow(c) }}
          >
            <CopyGlyph copied={copied === "ready"} />
          </button>
          <PromptCode c={c} body={body} />
        </div>
        {copyError && <div className="eon-prompt-copy-error" role="alert">{copyError}</div>}
      </section>

    </article>
  );
}

function PromptEditorModal({ c, prompt, categories, onClose, onSave }) {
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
            <span className="eon-accent-icon" style={{ background: c.active, color: c.brand }}>
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
                {[...new Set([...categories.map((category) => category.name), draft.category])]
                  .map((item) => <option key={item}>{item}</option>)}
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

function PromptDeleteModal({ c, prompt, restoreFocus, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = restoreFocus || document.activeElement;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll("button:not(:disabled)") || [])];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previous?.focus?.();
    };
  }, [busy, onClose, restoreFocus]);

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
        ref={dialogRef}
        className="eon-modal eon-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="eon-delete-prompt-title"
        aria-describedby="eon-delete-prompt-body"
        style={{ background: c.panel, borderColor: c.border }}
      >
        <div className="eon-confirm-icon" style={{ background: "rgba(217,130,149,.1)", color: "#D98295" }}><Trash2 size={18} /></div>
        <h2 id="eon-delete-prompt-title">Delete “{prompt.title}”?</h2>
        <p id="eon-delete-prompt-body" style={{ color: c.secondary }}>
          This removes the prompt and its reusable template for everyone on the team. This can't be undone.
        </p>
        {error && <div className="eon-prompt-editor-error" role="alert"><AlertCircle size={14} />{error}</div>}
        <div className="eon-confirm-actions">
          <button autoFocus className="eon-buttonish eon-secondary-button" type="button" onClick={onClose} disabled={busy} style={{ color: c.secondary, borderColor: c.border }}>
            Cancel
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

function CategoryManagerModal({
  c, categories, prompts, onClose, onCreate, onRequestDelete,
}) {
  const firstFieldRef = useRef(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a category name.");
      return;
    }
    if (trimmed.length > 60) {
      setError("Category names need to be 60 characters or fewer.");
      return;
    }
    if (categories.some((category) => category.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("That category already exists.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate(trimmed);
      setName("");
      firstFieldRef.current?.focus();
    } catch (createError) {
      setError(createError?.code === "23505"
        ? "That category already exists."
        : createError?.message || "The category could not be created. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div
        className="eon-modal eon-category-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="eon-category-manager-title"
        style={{ background: c.panel, borderColor: c.border, color: c.text }}
      >
        <div className="eon-modal-head" style={{ borderColor: c.border }}>
          <div className="eon-prompt-editor-heading">
            <span className="eon-accent-icon" style={{ background: c.active, color: c.brand }}><FolderCog size={16} /></span>
            <strong id="eon-category-manager-title">Manage categories</strong>
          </div>
          <button className="eon-buttonish eon-icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Close category manager" style={{ color: c.muted }}>
            <X size={17} />
          </button>
        </div>

        <div className="eon-modal-body eon-category-manager-body">
          <form className="eon-category-create" onSubmit={submit}>
            <EditorField label="New category">
              <Input
                ref={firstFieldRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                }}
                maxLength={60}
                placeholder="e.g. Product strategy"
                style={editorControl(c)}
              />
            </EditorField>
            <button className="eon-buttonish eon-category-add" type="submit" disabled={busy || !name.trim()} style={{ background: c.primary, color: c.primaryText }}>
              {busy ? <Loader2 className="eon-spin" size={15} /> : <FolderPlus size={15} />}
              {busy ? "Adding…" : "Add category"}
            </button>
          </form>
          {error && <div className="eon-prompt-editor-error" role="alert"><AlertCircle size={14} />{error}</div>}

          <section className="eon-category-list" aria-label="Prompt categories">
            {categories.map((category) => {
              const promptCount = prompts.filter((prompt) => prompt.category === category.name).length;
              const canDelete = Boolean(category.id);
              return (
                <div className="eon-category-row" key={category.id || category.name} style={{ background: c.raised, boxShadow: hubShadow(c) }}>
                  <span className="eon-category-row-icon eon-accent-icon" style={{ background: c.active, color: c.brand }}>
                    <FolderCog size={15} aria-hidden="true" />
                  </span>
                  <span className="eon-category-row-copy">
                    <strong>{category.name}</strong>
                    <small style={{ color: c.muted }}>
                      {promptCount} {promptCount === 1 ? "prompt" : "prompts"}
                    </small>
                  </span>
                  {canDelete && (
                    <button
                      className="eon-buttonish eon-category-delete"
                      type="button"
                      onClick={() => onRequestDelete(category)}
                      aria-label={`Delete ${category.name} category`}
                      title="Delete category"
                      style={{ color: "#D98295" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        </div>

        <div className="eon-modal-foot" style={{ borderColor: c.border }}>
          <span className="eon-category-manager-note" style={{ color: c.muted }}>
            Removing a category moves its prompts to another category.
          </span>
          <button className="eon-buttonish eon-prompt-editor-cancel" type="button" onClick={onClose} disabled={busy} style={{ color: c.secondary, borderColor: c.border }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryDeleteModal({
  c, category, promptCount, fallbackCategoryName, onClose, onDelete,
}) {
  const cancelRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previous?.focus?.();
    };
  }, [busy, onClose]);

  const remove = async () => {
    if (!fallbackCategoryName) return;
    setBusy(true);
    setError("");
    try {
      await onDelete();
      onClose();
    } catch (deleteError) {
      setError(deleteError?.message || "The category could not be deleted. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div
        className="eon-modal eon-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="eon-delete-category-title"
        aria-describedby="eon-delete-category-body"
        style={{ background: c.panel, borderColor: c.border }}
      >
        <div className="eon-confirm-icon" style={{ background: "rgba(217,130,149,.1)", color: "#D98295" }}><AlertTriangle size={18} /></div>
        <h2 id="eon-delete-category-title">Delete “{category.name}”?</h2>
        <p id="eon-delete-category-body" style={{ color: c.secondary }}>
          {!fallbackCategoryName
            ? "Create another category before deleting the last category."
            : promptCount > 0
              ? `${promptCount} ${promptCount === 1 ? "prompt" : "prompts"} will move to ${fallbackCategoryName}. No prompts will be deleted.`
              : "This empty category will be removed for everyone on the team."}
        </p>
        {error && <div className="eon-prompt-editor-error" role="alert"><AlertCircle size={14} />{error}</div>}
        <div className="eon-confirm-actions">
          <button ref={cancelRef} className="eon-buttonish eon-prompt-editor-cancel" type="button" onClick={onClose} disabled={busy} style={{ color: c.secondary, borderColor: c.border }}>
            Keep category
          </button>
          <button className="eon-buttonish eon-prompt-delete-confirm" type="button" onClick={remove} disabled={busy || !fallbackCategoryName}>
            {busy ? <Loader2 className="eon-spin" size={15} /> : <Trash2 size={15} />}
            {busy ? "Deleting…" : "Delete category"}
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
}) {
  return (
    <aside className="eon-prompt-use-rail" aria-label="Use this prompt">
      <div className="eon-prompt-use-card" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
        <div className="eon-prompt-use-head">
          <h2>Variables</h2>
        </div>

        <div className="eon-prompt-variables">
          {(prompt.variables || []).map((variable) => {
            const longField = /(material|constraints|behavior|context|source|dependencies|outcome|goal)/i.test(variable.key)
              && String(variable.example || variable.default || "").length > 44;
            const fieldStyle = {
              background: c.raised,
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

function hubShadow() {
  return "var(--shadow-surface)";
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
  return { background: c.raised, borderColor: c.border, color: c.text };
}

function newPromptDraft(categories = []) {
  return {
    id: null,
    title: "",
    category: categories.find((category) => category.name === "General")?.name
      || categories[0]?.name
      || "General",
    prompt_body: "",
    variables: [],
    version: 1,
  };
}
