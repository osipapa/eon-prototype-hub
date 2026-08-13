const FRAME_COUNT = 180;
const ORBIT_DURATION_MS = 3000;

const MARK_PATH =
  "M767.23 333.07L663.354 393.233C666.512 408.419 668.187 424.251 668.187 440.406C668.187 521.442 626.044 592.913 562.508 633.689C526.938 656.565 484.73 669.812 439.43 669.812C313.323 669.812 210.672 566.87 210.672 440.406C210.672 378.499 235.288 322.214 275.24 280.921C316.803 237.818 375.055 211 439.43 211C447.742 211 455.99 211.453 464.11 212.357L525.004 106.701L525.327 105.603C497.876 98.4299 469.007 94.6818 439.43 94.6818C332.075 94.6818 236.061 144.182 172.782 221.598C123.937 281.244 94.6821 357.497 94.6821 440.471C94.6821 631.104 249.335 786.195 439.43 786.195C505.802 786.195 567.856 767.261 620.503 734.498C718.707 673.496 784.113 564.479 784.113 440.471C784.113 402.991 778.12 366.932 767.101 333.135L767.23 333.07Z";

function faviconFrame(angle) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 879 881"><defs><linearGradient id="s" x1="689.581" y1="147.398" x2="402.778" y2="786.271" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#838287"/></linearGradient><radialGradient id="b" cx="0" cy="0" r="1" gradientTransform="translate(613 211) rotate(135) scale(745)"><stop stop-color="#29272f"/><stop offset="1" stop-color="#111015"/></radialGradient></defs><rect width="879" height="881" rx="220" fill="url(#b)"/><path d="${MARK_PATH}" fill="url(#s)" stroke="#fff" stroke-opacity=".56" stroke-width="5" transform="translate(439.43 440.44) scale(.58) translate(-439.43 -440.44)"/><circle cx="656.395" cy="201.436" r="78" fill="url(#s)" stroke="#fff" stroke-opacity=".7" stroke-width="3" transform="rotate(${angle} 439.43 440.44)"/></svg>`;
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
  let animationFrame = null;
  let startedAt = null;
  let previousFrame = -1;

  const stop = (reset = false) => {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
    startedAt = null;
    previousFrame = -1;
    if (reset) icon.href = fallbackHref;
  };

  const tick = (now) => {
    if (startedAt === null) startedAt = now;
    const progress = ((now - startedAt) % ORBIT_DURATION_MS) / ORBIT_DURATION_MS;
    const frame = Math.floor(progress * frames.length);

    if (frame !== previousFrame) {
      icon.href = frames[frame];
      previousFrame = frame;
    }

    animationFrame = window.requestAnimationFrame(tick);
  };

  const start = () => {
    stop();
    if (document.hidden || reducedMotion.matches) {
      icon.href = fallbackHref;
      return;
    }
    animationFrame = window.requestAnimationFrame(tick);
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
