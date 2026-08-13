const FRAME_COUNT = 240;
const ORBIT_DURATION_MS = 4200;
const HOME_HOLD_MS = 600;
const CYCLE_DURATION_MS = ORBIT_DURATION_MS + HOME_HOLD_MS;
const ICON_SIZE = 32;
const VIEWBOX_WIDTH = 879;
const VIEWBOX_HEIGHT = 881;
const CENTER_X = 439.43;
const CENTER_Y = 440.44;
const LOGO_SCALE = 0.58;
const ORBIT_RADIUS = 280;
const DOT_RADIUS = 68;
const HOME_ANGLE = -0.8336950024155341;

const MARK_PATH =
  "M767.23 333.07L663.354 393.233C666.512 408.419 668.187 424.251 668.187 440.406C668.187 521.442 626.044 592.913 562.508 633.689C526.938 656.565 484.73 669.812 439.43 669.812C313.323 669.812 210.672 566.87 210.672 440.406C210.672 378.499 235.288 322.214 275.24 280.921C316.803 237.818 375.055 211 439.43 211C447.742 211 455.99 211.453 464.11 212.357L525.004 106.701L525.327 105.603C497.876 98.4299 469.007 94.6818 439.43 94.6818C332.075 94.6818 236.061 144.182 172.782 221.598C123.937 281.244 94.6821 357.497 94.6821 440.471C94.6821 631.104 249.335 786.195 439.43 786.195C505.802 786.195 567.856 767.261 620.503 734.498C718.707 673.496 784.113 564.479 784.113 440.471C784.113 402.991 778.12 366.932 767.101 333.135L767.23 333.07Z";

function createFaviconFrames() {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const context = canvas.getContext("2d");

  if (!context || typeof Path2D === "undefined") return [];

  const mark = new Path2D(MARK_PATH);
  const frames = [];

  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const orbitProgress = index / (FRAME_COUNT - 1);
    const angle = HOME_ANGLE + orbitProgress * Math.PI * 2;
    const dotX = CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
    const dotY = CENTER_Y + Math.sin(angle) * ORBIT_RADIUS;

    context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    context.save();
    context.scale(ICON_SIZE / VIEWBOX_WIDTH, ICON_SIZE / VIEWBOX_HEIGHT);

    context.fillStyle = "#141319";
    context.beginPath();
    context.roundRect(0, 0, VIEWBOX_WIDTH, VIEWBOX_HEIGHT, 220);
    context.fill();

    const silver = context.createLinearGradient(689.581, 147.398, 402.778, 786.271);
    silver.addColorStop(0, "#ffffff");
    silver.addColorStop(1, "#838287");

    context.save();
    context.translate(CENTER_X, CENTER_Y);
    context.scale(LOGO_SCALE, LOGO_SCALE);
    context.translate(-CENTER_X, -CENTER_Y);
    context.fillStyle = silver;
    context.fill(mark);
    context.strokeStyle = "rgba(255, 255, 255, 0.56)";
    context.lineWidth = 5;
    context.stroke(mark);
    context.restore();

    context.fillStyle = silver;
    context.strokeStyle = "rgba(255, 255, 255, 0.7)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(dotX, dotY, DOT_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.restore();
    frames.push(canvas.toDataURL("image/png"));
  }

  return frames;
}

/**
 * Chrome does not run animation inside SVG favicons, but it does repaint when
 * the favicon URL changes. Pre-render tiny PNG frames so each repaint only
 * swaps a decoded bitmap, then leave the authored SVG as the static fallback.
 */
export function startAnimatedFavicon() {
  const icon = document.querySelector('link[rel~="icon"]');
  if (!icon) return () => {};

  const fallbackHref = icon.href;
  const fallbackType = icon.type;
  const fallbackSizes = icon.getAttribute("sizes");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const frames = createFaviconFrames();
  if (!frames.length) return () => {};

  const preloadedFrames = frames.map((src) => {
    const image = new Image();
    image.src = src;
    return image;
  });

  let animationFrame = null;
  let startedAt = null;
  let previousFrame = -1;
  let disposed = false;

  const showFallback = () => {
    icon.type = fallbackType;
    if (fallbackSizes === null) icon.removeAttribute("sizes");
    else icon.setAttribute("sizes", fallbackSizes);
    icon.href = fallbackHref;
  };

  const stop = (reset = false) => {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
    startedAt = null;
    previousFrame = -1;
    if (reset) showFallback();
  };

  const tick = (now) => {
    if (startedAt === null) startedAt = now;
    const elapsed = (now - startedAt) % CYCLE_DURATION_MS;
    const rawProgress = Math.max(0, elapsed - HOME_HOLD_MS) / ORBIT_DURATION_MS;
    const progress = Math.min(rawProgress, 1);
    const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
    const frame = Math.round(easedProgress * (frames.length - 1));

    if (frame !== previousFrame) {
      icon.href = frames[frame];
      previousFrame = frame;
    }

    animationFrame = window.requestAnimationFrame(tick);
  };

  const start = () => {
    stop();
    if (document.hidden || reducedMotion.matches) {
      showFallback();
      return;
    }
    icon.type = "image/png";
    icon.setAttribute("sizes", `${ICON_SIZE}x${ICON_SIZE}`);
    animationFrame = window.requestAnimationFrame(tick);
  };

  const handleVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotion.addEventListener("change", start);
  Promise.allSettled(
    preloadedFrames.map((image) => image.decode?.() ?? Promise.resolve()),
  ).then(() => {
    if (!disposed) start();
  });

  return () => {
    disposed = true;
    stop(true);
    preloadedFrames.length = 0;
    document.removeEventListener("visibilitychange", handleVisibility);
    reducedMotion.removeEventListener("change", start);
  };
}
