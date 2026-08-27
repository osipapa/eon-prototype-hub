/* Live local file link ------------------------------------------------------
   Wraps the File System Access API so a prototype can render straight from a
   file on disk: pick once, then every editor save is detected and streamed
   into the workspace (and, with auto-publish, through the normal Supabase
   save path to the whole team). Chromium-only; callers feature-detect with
   supportsFileLink() and hide the UI elsewhere.

   Handles are kept in IndexedDB so a reload can offer to reconnect, but the
   browser only regrants read access inside a user gesture, so reconnecting is
   always an explicit click, never automatic. */

const DB_NAME = "eon-file-links";
const DB_VERSION = 1;
const STORE = "handles";

export function supportsFileLink() {
  return typeof window.showOpenFilePicker === "function";
}

// Returns {handle, name, content, lastModified, size}, or null if cancelled.
export async function pickHtmlFile() {
  let handles;
  try {
    handles = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "HTML prototype", accept: { "text/html": [".html", ".htm"] } }],
    });
  } catch (error) {
    if (error?.name === "AbortError") return null;
    throw error;
  }
  const handle = handles[0];
  const file = await handle.getFile();
  return { handle, name: file.name, content: await file.text(), lastModified: file.lastModified, size: file.size };
}

/* Permission -------------------------------------------------------------- */

// Chromium can drop a granted handle between sessions. requestPermission only
// resolves inside a user gesture, so only call this straight from a click.
export async function ensureReadPermission(handle) {
  const options = { mode: "read" };
  try {
    if (await handle.queryPermission?.(options) === "granted") return true;
    return await handle.requestPermission?.(options) === "granted";
  } catch {
    return false;
  }
}

/* Remembered handles ------------------------------------------------------ */

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("No IndexedDB")); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, run) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve(request?.result);
    });
  } finally {
    db.close();
  }
}

// A remembered link is a hint for the next session, never a live connection.
export async function rememberFileLink(projectId, handle, name) {
  try { await withStore("readwrite", (store) => store.put({ handle, name }, projectId)); }
  catch { /* private mode or a blocked store just means no reconnect offer */ }
}

export async function recallFileLink(projectId) {
  try { return (await withStore("readonly", (store) => store.get(projectId))) || null; }
  catch { return null; }
}

export async function forgetFileLink(projectId) {
  try { await withStore("readwrite", (store) => store.delete(projectId)); }
  catch { /* nothing to clean up */ }
}

/* Watching ---------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function describe(error) {
  if (error?.name === "NotFoundError") {
    return Object.assign(new Error("The linked file was moved or deleted. Link it again to resume."), { reason: "missing" });
  }
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return Object.assign(new Error("The browser revoked access to the linked file. Link it again to resume."), { reason: "permission" });
  }
  return Object.assign(new Error("Couldn't read the linked file after several tries. Link it again to resume."), { reason: "unreadable" });
}

/* Poll the handle for changes (FileSystemObserver is still behind flags, so
   mtime polling is the dependable path).

   onChange(content, mtime) fires only for a change that reads back cleanly.
   onError fires once, with error.reason, when the link is genuinely lost;
   polling stops then. A single failed read does not end the link: editors that
   save atomically leave brief windows where the file is locked, missing, or
   half written, and dropping the link on the first of those was the main way
   live sync used to die silently. Returns stop(). */
export function watchFile(handle, initial, onChange, onError, options = {}) {
  const intervalMs = options.intervalMs ?? 700;
  const settleMs = options.settleMs ?? 120;
  const maxFailures = options.maxFailures ?? 8;

  let lastModified = typeof initial === "number" ? initial : (initial?.lastModified ?? 0);
  let lastSize = typeof initial === "number" ? -1 : (initial?.size ?? -1);
  let failures = 0;
  let reading = false;
  let stopped = false;
  let timer = 0;

  const stop = () => {
    stopped = true;
    window.clearInterval(timer);
  };

  // Read, then confirm the file did not move underneath the read. A truncated
  // or half-flushed save would otherwise be published to the whole team.
  const readSettled = async () => {
    const before = await handle.getFile();
    const text = await before.text();
    await sleep(settleMs);
    const after = await handle.getFile();
    if (after.lastModified !== before.lastModified || after.size !== before.size) return null;
    return { text, modified: after.lastModified, size: after.size };
  };

  const tick = async () => {
    if (reading || stopped) return;
    reading = true;
    try {
      const probe = await handle.getFile();
      // Not `>`: restoring an older version (git checkout, undo) moves the
      // timestamp backwards, and that is still a change worth rendering.
      const changed = probe.lastModified !== lastModified || probe.size !== lastSize;
      failures = 0;
      if (!changed) return;

      const settled = await readSettled();
      // Still being written. Leave the last-seen marks alone and try again.
      if (!settled) return;
      // An empty read almost always means a truncate caught mid-save.
      if (!settled.text.trim()) return;

      lastModified = settled.modified;
      lastSize = settled.size;
      onChange(settled.text, settled.modified);
    } catch (error) {
      failures += 1;
      const fatal = error?.name === "NotFoundError"
        || error?.name === "NotAllowedError"
        || error?.name === "SecurityError";
      if (fatal || failures >= maxFailures) {
        stop();
        onError?.(describe(error));
      }
    } finally {
      reading = false;
    }
  };

  timer = window.setInterval(tick, intervalMs);
  return stop;
}
