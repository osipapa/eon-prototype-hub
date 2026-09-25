/* Linked-file sync guard. While a local file is linked, a server version newer
   than the one the file last synced against means someone else saved (a
   teammate, or their Claude). Versions this browser published are our own
   realtime echoes, never conflicts. While our own publish is in flight its
   echo can beat the response, so nothing is judged until the response lands. */
export function isForeignChange(serverVersion, baseVersion, ownVersions, publishing = false) {
  if (publishing) return false;
  if (serverVersion == null || baseVersion == null) return false;
  if (serverVersion <= baseVersion) return false;
  return !ownVersions.has(serverVersion);
}

/* Reconnecting a remembered file after a reload. The file may be stale (a
   teammate saved while we were away) or newer (edited offline), so it only
   publishes when nobody saved since the version it last synced against. */
export function reconnectPlan({ storedBase, fileContent, serverHtml, serverVersion }) {
  if (fileContent === serverHtml) return { baseVersion: serverVersion, conflict: false };
  if (storedBase == null) return { baseVersion: serverVersion, conflict: true };
  return { baseVersion: storedBase, conflict: storedBase !== serverVersion };
}
