const FRAME_COUNT = 48;
const FRAME_INTERVAL_MS = 125;

function faviconFrame(angle) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#121216"/><circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="6"/><path d="M32 10a22 22 0 0 1 0 44" fill="none" stroke="#EDD2F6" stroke-width="6" stroke-linecap="round" transform="rotate(${angle} 32 32)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Chrome does not run animation inside SVG favicons, but it does repaint when
 * the favicon URL changes. Cycle lightweight static SVG frames while the page
 * is visible, and leave the authored SVG as the fallback everywhere else.
 */
export function startAnimatedFavicon() {
  const icon = document.querySelector('link[rel~="icon"]');
  if (!icon) return () => {};

  const fallbackHref = icon.href;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const frames = Array.from(
    { length: FRAME_COUNT },
    (_, index) => faviconFrame((index * 360) / FRAME_COUNT),
  );
  let frame = 0;
  let timer = null;

  const stop = (reset = false) => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    if (reset) icon.href = fallbackHref;
  };

  const start = () => {
    stop();
    if (document.hidden || reducedMotion.matches) {
      icon.href = fallbackHref;
      return;
    }
    icon.href = frames[frame];
    timer = window.setInterval(() => {
      frame = (frame + 1) % frames.length;
      icon.href = frames[frame];
    }, FRAME_INTERVAL_MS);
  };

  const handleVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotion.addEventListener("change", start);
  start();

  return () => {
    stop(true);
    document.removeEventListener("visibilitychange", handleVisibility);
    reducedMotion.removeEventListener("change", start);
  };
}
