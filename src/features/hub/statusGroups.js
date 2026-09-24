/* Sidebar sections. By status, each prototype sits under its Linear issue's
   workflow state, in Linear's order, with unlinked prototypes last. By group,
   under the group the team gave it. A status seen once is remembered in this
   browser, so sections don't jump around while Linear loads on the next visit. */

const STATUS_CACHE_KEY = "eon-linear-status";
// Linear's workflow state types, in the order its board shows them.
const STATE_TYPE_ORDER = ["triage", "backlog", "unstarted", "started", "completed", "canceled"];

export function readStatusCache() {
  try { return JSON.parse(window.localStorage.getItem(STATUS_CACHE_KEY) || "{}"); }
  catch { return {}; }
}

// Fold freshly loaded issues into the cache. Returns the same object when
// nothing changed, so callers can skip the write.
export function mergeStatusCache(cache, projects, issuesByProject, identifierFor) {
  let next = cache;
  projects.forEach((project) => {
    const state = issuesByProject[project.id]?.state;
    const identifier = identifierFor(project);
    if (!state?.name || !identifier) return;
    const entry = { identifier, name: state.name, color: state.color || "", type: state.type || "" };
    const known = cache[project.id];
    if (known && Object.keys(entry).every((key) => known[key] === entry[key])) return;
    if (next === cache) next = { ...cache };
    next[project.id] = entry;
  });
  if (next !== cache) {
    try { window.localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(next)); }
    catch { /* The cache only smooths loading; live statuses still arrive. */ }
  }
  return next;
}

function statusSection(identifier, issue, cached) {
  if (!identifier) return { key: "status:none", label: "No issue", kind: "status", rank: 99, empty: true };
  // A cached status only counts for the issue it was read from.
  const state = issue?.state || (cached?.identifier === identifier ? cached : null);
  if (!state?.name) return { key: "status:unknown", label: "Status unknown", kind: "status", rank: 98, empty: true };
  const rank = STATE_TYPE_ORDER.indexOf(state.type);
  return {
    key: `status:${state.name}`,
    label: state.name,
    color: state.color || null,
    kind: "status",
    rank: rank === -1 ? STATE_TYPE_ORDER.length : rank,
  };
}

// Projects arrive in sidebar order and keep it inside each section.
export function buildSections(projects, { by, query = "", issuesByProject = {}, statusCache = {}, identifierFor }) {
  const needle = query.trim().toLowerCase();
  const sections = new Map();
  projects.forEach((project) => {
    const identifier = identifierFor(project);
    const group = project.group_name || "General";
    const status = statusSection(identifier, issuesByProject[project.id], statusCache[project.id]);
    const haystack = `${project.title} ${group} ${identifier || ""} ${status.label}`.toLowerCase();
    if (needle && !haystack.includes(needle)) return;
    const section = by === "status" ? status : { key: `group:${group}`, label: group, kind: "group" };
    if (!sections.has(section.key)) sections.set(section.key, { ...section, items: [] });
    sections.get(section.key).items.push(project);
  });
  const list = [...sections.values()];
  if (by === "status") list.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
  return list;
}
