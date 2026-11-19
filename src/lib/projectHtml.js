/* Prototype HTML loads per prototype, not with the list: the list stays a few
   kilobytes however many prototypes the team has. On a project row:
     prototype_html === undefined  not loaded yet (html_version > 0 says there is some)
     prototype_html === null       the prototype has no uploaded HTML
     html_stale                    loaded, but the server has a newer version */

// There is HTML on the server and this browser hasn't loaded it yet.
export function htmlPending(project) {
  return Boolean(project) && project.prototype_html === undefined && project.html_version > 0;
}

// The HTML this browser holds is missing or behind the server's.
export function htmlNeeded(project) {
  return htmlPending(project) || Boolean(project?.html_stale);
}

// A server row, with the HTML this browser already holds carried over when the
// row arrives without it (a list refresh, a save response, a realtime update
// that left the unchanged column out).
export function carryHtml(row, existing) {
  if (row.prototype_html !== undefined) return { ...row, html_stale: false };
  if (!row.html_version) return { ...row, prototype_html: null, html_stale: false };
  if (!existing || existing.prototype_html === undefined) return { ...row, prototype_html: undefined };
  return {
    ...row,
    prototype_html: existing.prototype_html,
    html_stale: Boolean(existing.html_stale) || existing.html_version !== row.html_version,
  };
}

// The result of fetching one prototype's HTML, merged into its row.
export function withFetchedHtml(project, fresh) {
  // Always settles to loaded (a string or null), so nothing asks twice.
  return { ...project, ...fresh, prototype_html: fresh?.prototype_html ?? null, html_stale: false };
}
