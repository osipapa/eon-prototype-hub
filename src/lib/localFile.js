/* Live local file link ------------------------------------------------------
   Wraps the File System Access API so a prototype can render straight from a
   file on disk: pick once, then every editor save is detected and streamed
   into the workspace (and, with auto-publish, through the normal Supabase
   save path to the whole team). Chromium-only; callers feature-detect with
   supportsFileLink() and hide the UI elsewhere. Handles don't survive a page
   reload. The link lasts for the current session. */

export function supportsFileLink() {
  return typeof window.showOpenFilePicker === "function";
}

// Returns {handle, name, content, lastModified}, or null if the user cancels.
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
  return { handle, name: file.name, content: await file.text(), lastModified: file.lastModified };
}

/* Poll the handle for changes (the FileSystemObserver API is still behind
   flags, so mtime polling is the dependable path). onChange(content, mtime)
   fires only when lastModified moves. onError fires once if the file becomes
   unreadable (moved/deleted or permission revoked); polling stops then.
   Returns stop(). */
export function watchFile(handle, initialModified, onChange, onError, intervalMs = 1000) {
  let last = initialModified || 0;
  let reading = false;
  const timer = window.setInterval(async () => {
    if (reading) return;
    reading = true;
    try {
      const file = await handle.getFile();
      if (file.lastModified > last) {
        last = file.lastModified;
        onChange(await file.text(), file.lastModified);
      }
    } catch (error) {
      window.clearInterval(timer);
      onError?.(error);
    } finally {
      reading = false;
    }
  }, intervalMs);
  return () => window.clearInterval(timer);
}
