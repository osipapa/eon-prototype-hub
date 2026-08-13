const FRAME_COUNT = 72;
const MORPH_DURATION_MS = 720;
const CURSOR_HOLD_MS = 900;
const RETURN_DURATION_MS = 720;
const LOGO_HOLD_MS = 2500;
const CYCLE_DURATION_MS =
  MORPH_DURATION_MS + CURSOR_HOLD_MS + RETURN_DURATION_MS + LOGO_HOLD_MS;
const ICON_SIZE = 32;
const VIEWBOX_WIDTH = 879;
const VIEWBOX_HEIGHT = 881;
const CENTER_X = 439.43;
const CENTER_Y = 440.44;
const LOGO_SCALE = 0.72;
const SOURCE_DOT_X = 656.395;
const SOURCE_DOT_Y = 201.436;
const SOURCE_DOT_RADIUS = 84.008;
const DOT_X = CENTER_X + (SOURCE_DOT_X - CENTER_X) * LOGO_SCALE;
const DOT_Y = CENTER_Y + (SOURCE_DOT_Y - CENTER_Y) * LOGO_SCALE;
const DOT_RADIUS = SOURCE_DOT_RADIUS * LOGO_SCALE;

const MARK_PATH =
  "M767.23 333.07L663.354 393.233C666.512 408.419 668.187 424.251 668.187 440.406C668.187 521.442 626.044 592.913 562.508 633.689C526.938 656.565 484.73 669.812 439.43 669.812C313.323 669.812 210.672 566.87 210.672 440.406C210.672 378.499 235.288 322.214 275.24 280.921C316.803 237.818 375.055 211 439.43 211C447.742 211 455.99 211.453 464.11 212.357L525.004 106.701L525.327 105.603C497.876 98.4299 469.007 94.6818 439.43 94.6818C332.075 94.6818 236.061 144.182 172.782 221.598C123.937 281.244 94.6821 357.497 94.6821 440.471C94.6821 631.104 249.335 786.195 439.43 786.195C505.802 786.195 567.856 767.261 620.503 734.498C718.707 673.496 784.113 564.479 784.113 440.471C784.113 402.991 778.12 366.932 767.101 333.135L767.23 333.07Z";
const CURSOR_PATH =
  "M275 143L672 463L491 497L598 708L502 756L395 543L275 678V143Z";

const smoothstep = (progress) => progress * progress * (3 - 2 * progress);
const mix = (from, to, progress) => from + (to - from) * progress;

function drawLogo(context, mark, progress) {
  const eased = smoothstep(progress);
  const alpha = 1 - eased;
  if (alpha <= 0) return;

  context.save();
  context.globalAlpha = alpha;
  context.filter = `blur(${Math.sin(progress * Math.PI) * 0.8}px)`;
  context.translate(CENTER_X, CENTER_Y);
  context.rotate(mix(0, -Math.PI / 22, eased));
  const morphScale = mix(1, 0.84, eased);
  context.scale(morphScale, morphScale);
  context.translate(-CENTER_X, -CENTER_Y);

  context.save();
  context.translate(CENTER_X, CENTER_Y);
  context.scale(LOGO_SCALE, LOGO_SCALE);
  context.translate(-CENTER_X, -CENTER_Y);
  context.fillStyle = "#ffffff";
  context.fill(mark);
  context.restore();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(DOT_X, DOT_Y, DOT_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCursor(context, cursor, progress) {
  const eased = smoothstep(progress);
  if (eased <= 0) return;

  context.save();
  context.globalAlpha = eased;
  context.filter = `blur(${Math.sin(progress * Math.PI) * 0.8}px)`;
  context.translate(CENTER_X, CENTER_Y);
  context.rotate(mix(Math.PI / 22, 0, eased));
  const morphScale = mix(0.76, 1, eased);
  context.scale(morphScale, morphScale);
  context.translate(-CENTER_X, -CENTER_Y);
  context.fillStyle = "#ffffff";
  context.fill(cursor);
  context.restore();
}

function createFaviconFrames() {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const context = canvas.getContext("2d");

  if (!context || typeof Path2D === "undefined") return [];

  const mark = new Path2D(MARK_PATH);
  const cursor = new Path2D(CURSOR_PATH);
  const frames = [];

  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const progress = index / (FRAME_COUNT - 1);
    context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    context.save();
    context.scale(ICON_SIZE / VIEWBOX_WIDTH, ICON_SIZE / VIEWBOX_HEIGHT);

    const backdrop = context.createRadialGradient(613, 211, 0, 613, 211, 745);
    backdrop.addColorStop(0, "#29272f");
    backdrop.addColorStop(1, "#111015");
    context.fillStyle = backdrop;
    context.beginPath();
    context.roundRect(0, 0, VIEWBOX_WIDTH, VIEWBOX_HEIGHT, 220);
    context.fill();

    drawLogo(context, mark, progress);
    drawCursor(context, cursor, progress);
    context.restore();
    frames.push(canvas.toDataURL("image/png"));
  }

  return frames;
}

/**
 * Chrome does not run animation inside SVG favicons, but it does repaint when
 * the favicon URL changes. Pre-render the logo-to-cursor transition as tiny
 * PNG frames, then leave the authored SVG as the static fallback.
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
    let progress = 0;

    if (elapsed < MORPH_DURATION_MS) {
      progress = elapsed / MORPH_DURATION_MS;
    } else if (elapsed < MORPH_DURATION_MS + CURSOR_HOLD_MS) {
      progress = 1;
    } else if (
      elapsed <
      MORPH_DURATION_MS + CURSOR_HOLD_MS + RETURN_DURATION_MS
    ) {
      const returnElapsed = elapsed - MORPH_DURATION_MS - CURSOR_HOLD_MS;
      progress = 1 - returnElapsed / RETURN_DURATION_MS;
    }

    const frame = Math.min(
      frames.length - 1,
      Math.round(progress * (frames.length - 1)),
    );

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
