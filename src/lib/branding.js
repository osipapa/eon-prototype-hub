export const PUBLIC_EON_LOGO_CACHE_KEY = "eon:public-brand-logo";

export function safeBrandLogoUrl(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return "";
  if (/^data:image\/(?:avif|gif|jpe?g|png|svg\+xml|webp)(?:;charset=[a-z0-9_-]+)?(?:;base64)?,/i.test(candidate)) return candidate;
  if (/[\u0000-\u0020\u007f"'<>`]/.test(candidate)) return "";
  try {
    const base = typeof window === "undefined" ? "https://eon.invalid/" : window.location.origin;
    const url = new URL(candidate, base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function readCachedEonLogo() {
  if (typeof window === "undefined") return "";
  try {
    return safeBrandLogoUrl(window.localStorage.getItem(PUBLIC_EON_LOGO_CACHE_KEY));
  } catch {
    return "";
  }
}

export function cacheEonLogo(value) {
  const safeUrl = safeBrandLogoUrl(value);
  if (typeof window === "undefined") return safeUrl;
  try {
    if (safeUrl) window.localStorage.setItem(PUBLIC_EON_LOGO_CACHE_KEY, safeUrl);
    else window.localStorage.removeItem(PUBLIC_EON_LOGO_CACHE_KEY);
  } catch {
    // The logo slot's skeleton keeps layouts stable when storage is unavailable.
  }
  return safeUrl;
}
