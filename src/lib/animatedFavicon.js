const FRAME_COUNT = 120;
const SHINE_DURATION_MS = 1800;
const REST_DURATION_MS = 2600;
const CYCLE_DURATION_MS = SHINE_DURATION_MS + REST_DURATION_MS;
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
const SHINE_ANGLE = Math.PI / 9;
const SHINE_NORMAL_X = Math.cos(SHINE_ANGLE);
const SHINE_NORMAL_Y = Math.sin(SHINE_ANGLE);
const SHINE_DISTANCE = 800;
const SHINE_HALF_WIDTH = 160;

const MARK_PATH =
  "M767.23 333.07L663.354 393.233C666.512 408.419 668.187 424.251 668.187 440.406C668.187 521.442 626.044 592.913 562.508 633.689C526.938 656.565 484.73 669.812 439.43 669.812C313.323 669.812 210.672 566.87 210.672 440.406C210.672 378.499 235.288 322.214 275.24 280.921C316.803 237.818 375.055 211 439.43 211C447.742 211 455.99 211.453 464.11 212.357L525.004 106.701L525.327 105.603C497.876 98.4299 469.007 94.6818 439.43 94.6818C332.075 94.6818 236.061 144.182 172.782 221.598C123.937 281.244 94.6821 357.497 94.6821 440.471C94.6821 631.104 249.335 786.195 439.43 786.195C505.802 786.195 567.856 767.261 620.503 734.498C718.707 673.496 784.113 564.479 784.113 440.471C784.113 402.991 778.12 366.932 767.101 333.135L767.23 333.07Z";

function drawMark(context, mark, fillStyle, strokeStyle) {
  context.save();
  context.translate(CENTER_X, CENTER_Y);
  context.scale(LOGO_SCALE, LOGO_SCALE);
  context.translate(-CENTER_X, -CENTER_Y);
  context.fillStyle = fillStyle;
  context.fill(mark);
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = 5;
    context.stroke(mark);
  }
  context.restore();

  context.fillStyle = fillStyle;
  context.beginPath();
  context.arc(DOT_X, DOT_Y, DOT_RADIUS, 0, Math.PI * 2);
  context.fill();
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = 3;
    context.stroke();
  }
}

function createFaviconFrames() {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const context = canvas.getContext("2d");

  if (!context || typeof Path2D === "undefined") return [];

  const mark = new Path2D(MARK_PATH);
  const frames = [];

  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const progress = index / (FRAME_COUNT - 1);
    const shineOffset = -SHINE_DISTANCE + progress * SHINE_DISTANCE * 2;
    const shineCenterX = CENTER_X + SHINE_NORMAL_X * shineOffset;
    const shineCenterY = CENTER_Y + SHINE_NORMAL_Y * shineOffset;

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

    const silver = context.createLinearGradient(689.581, 147.398, 402.778, 786.271);
    silver.addColorStop(0, "#ffffff");
    silver.addColorStop(1, "#838287");
    drawMark(context, mark, silver, "rgba(255, 255, 255, 0.62)");

    const shine = context.createLinearGradient(
      shineCenterX - SHINE_NORMAL_X * SHINE_HALF_WIDTH,
      shineCenterY - SHINE_NORMAL_Y * SHINE_HALF_WIDTH,
      shineCenterX + SHINE_NORMAL_X * SHINE_HALF_WIDTH,
      shineCenterY + SHINE_NORMAL_Y * SHINE_HALF_WIDTH,
    );
    shine.addColorStop(0, "rgba(255, 255, 255, 0)");
    shine.addColorStop(0.25, "rgba(255, 255, 255, 0)");
    shine.addColorStop(0.43, "rgba(255, 255, 255, 0.38)");
    shine.addColorStop(0.5, "rgba(255, 255, 255, 0.96)");
    shine.addColorStop(0.57, "rgba(255, 255, 255, 0.38)");
    shine.addColorStop(0.75, "rgba(255, 255, 255, 0)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.globalCompositeOperation = "screen";
    drawMark(context, mark, shine);
    context.globalCompositeOperation = "source-over";
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
    const frame =
      elapsed < SHINE_DURATION_MS
        ? Math.min(
            frames.length - 1,
            Math.floor((elapsed / SHINE_DURATION_MS) * frames.length),
          )
        : 0;

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
