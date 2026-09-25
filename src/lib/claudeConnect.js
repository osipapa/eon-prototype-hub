/* Connect Claude: the hub's MCP connector and whether Claude can sign in yet.
   Sign-in needs Supabase Auth's OAuth server switched on (an admin setting). */
export const CONNECTOR_URL = `${import.meta.env?.VITE_SUPABASE_URL}/functions/v1/hub-mcp`;
export const CLAUDE_CODE_COMMAND = `claude mcp add --transport http eon-hub ${CONNECTOR_URL}`;

// "ready" | "off" | "unknown" from the OAuth discovery response.
export function signInStatus(status, body) {
  if (status === 200) return "ready";
  if (status === 404 && body?.error_code === "feature_disabled") return "off";
  return "unknown";
}

export async function fetchSignInStatus() {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`);
    const body = await response.json().catch(() => null);
    return signInStatus(response.status, body);
  } catch {
    return "unknown";
  }
}
