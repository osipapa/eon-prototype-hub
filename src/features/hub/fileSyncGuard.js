/* Linked-file sync guard. While a local file is linked, a server version newer
   than the one the file last synced against means someone else saved (a
   teammate, or their Claude). Versions this browser published are our own
   realtime echoes, never conflicts. */
export function isForeignChange(serverVersion, baseVersion, ownVersions) {
  if (serverVersion == null || baseVersion == null) return false;
  if (serverVersion <= baseVersion) return false;
  return !ownVersions.has(serverVersion);
}
