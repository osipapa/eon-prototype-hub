import { useState } from "react";
import { EON_MARK_DOT, EON_MARK_PATH } from "@/components/EonGlyph";

// Full-screen loading state, shared by the app splash (auth/chunk loads) and
// the hub's first data fetch. Above the title, the Eon mark is drafted like a
// logo sheet: axes shoot out from the centre, circles are swept round as if by
// a compass, guides and measures extend, then a point of light traces the mark
// over them. To finish, the guides recede and the mark takes a faint chrome
// fill. That plays once per page load; after it, the title pulses for as long
// as loading lasts. The status line is for screen readers.

// Geometry of the mark, with the ring's centre at 0,0 (see EonGlyph).
// R/r: outer and inner ring radius. M: the band's centre line. W: half the
// band. The cut faces fan out 15 degrees either side of a 45 degree bisector
// from V; the dot (D, radius DR) sits on that bisector, and a circle of twice
// its radius touches both faces.
const R = 249;
const r = 165;
const M = 207;
const W = 42;
const V = [-166.7, 155.3];
const D = [EON_MARK_DOT.cx, EON_MARK_DOT.cy];
const DR = EON_MARK_DOT.r;
const SQ = 116.7; // half side of the square inscribed in the inner circle

// Shapes are paths so they can be drawn on: a circle starts at `start` degrees
// and runs clockwise (or not); a rectangle starts at its top-left corner.
const circle = (cx, cy, rad, start = -90, ccw = false) => {
  const a = (start * Math.PI) / 180;
  const [x, y] = [cx + rad * Math.cos(a), cy + rad * Math.sin(a)].map((n) => n.toFixed(1));
  const [ox, oy] = [cx - rad * Math.cos(a), cy - rad * Math.sin(a)].map((n) => n.toFixed(1));
  const arc = `A${rad} ${rad} 0 1 ${ccw ? 0 : 1}`;
  return `M${x} ${y}${arc} ${ox} ${oy}${arc} ${x} ${y}`;
};
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;

// [path, start ms, duration ms, extra class]. Dotted shapes are revealed
// through a mask that is drawn on, so the dots stay put while the line grows.
const DOTTED = [
  [circle(0, 0, R, -90), 80, 800],
  [circle(0, 0, r, 90, true), 160, 700],
  [rect(-R, -R, R * 2, R * 2), 240, 700],
  [circle(0, 0, M, 180), 320, 700, "bp-centerline"],
  [circle(M, 0, W, 0), 420, 450],
  [circle(0, M, W, 90), 460, 450],
  [circle(-M, 0, W, 180), 500, 450],
  [circle(0, -M, W, -90), 540, 450],
  [rect(-SQ, -SQ, SQ * 2, SQ * 2), 560, 500],
  [rect(D[0] - DR, D[1] - DR, DR * 2, DR * 2), 820, 450],
  [circle(D[0], D[1], DR * 2, -45), 900, 600],
];

// Solid hairlines draw themselves: axes from the centre out, the diagonal,
// the cut's two faces and bisector from V, the angle arc, the dot's axes, and
// the two measure lines.
const LINES = [
  ["M0 0H318", 0, 500],
  ["M0 0H-318", 0, 500],
  ["M0 0V318", 0, 500],
  ["M0 0V-318", 0, 500],
  [`M${-R} ${-R}L${R} ${R}`, 600, 500],
  [`M${V[0]} ${V[1]}L318.3 -124.7`, 680, 450],
  [`M${V[0]} ${V[1]}L257.6 -269`, 730, 450],
  [`M${V[0]} ${V[1]}L103.3 -312.4`, 780, 450],
  ["M-121.7 77.4A90 90 0 0 1 -88.8 110.3", 900, 300],
  [`M${D[0] - 80} ${D[1]}h160`, 860, 350],
  [`M${D[0]} ${D[1] - 80}v160`, 900, 350],
  [`M${-R} 291H${R}`, 980, 450],
  [`M-291 ${-r}V${r}`, 1020, 450],
];

// Small marks fade in: ticks where the circles cross the axes, registration
// crosses at the square's corners, and the measures' end ticks.
const MARKS = [
  [[R, -R, r, -r, M, -M].map((x) => `M${x} -6V6M-6 ${x}H6`).join(""), 380],
  [[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => `M${sx * (R + 20) - 7} ${sy * (R + 20)}h14M${sx * (R + 20)} ${sy * (R + 20) - 7}v14`).join(""), 520],
  [`M${-R} 284v14M${R} 284v14M-298 ${-r}h14M-298 ${r}h14`, 1100],
];

const at = (start, duration) => ({ "--d": `${start}ms`, ...(duration ? { "--dur": `${duration}ms` } : {}) });

// The splash, the hub's first fetch and later route loads each mount their own
// LoadingScreen. They share one clock, so a later one picks the animation up
// where the first has got to (or shows it finished) instead of replaying it.
let startedAt = null;

export default function LoadingScreen({ children = "Loading…" }) {
  const [elapsed] = useState(() => {
    if (startedAt === null) startedAt = performance.now();
    return Math.round(performance.now() - startedAt);
  });
  return (
    <div className="eon-loading-screen" role="status" aria-live="polite" style={{ "--t0": `${-elapsed}ms` }}>
      <svg className="eon-loading-blueprint" viewBox="-330 -330 660 660" aria-hidden="true">
        <defs>
          <linearGradient id="eon-bp-chrome" gradientUnits="userSpaceOnUse" x1={-R} y1={-R} x2={R} y2={R}>
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#6F6E73" />
          </linearGradient>
          <radialGradient id="eon-bp-halo">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity=".7" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          {DOTTED.map(([d, start, duration], n) => (
            <mask key={d} id={`eon-bp-m${n}`} maskUnits="userSpaceOnUse" x="-330" y="-330" width="660" height="660">
              <path className="bp-reveal" style={at(start, duration)} pathLength="1" d={d} />
            </mask>
          ))}
        </defs>

        <g className="bp-guides">
          {LINES.map(([d, start, duration]) => (
            <path key={d} className="bp-line" style={at(start, duration)} pathLength="1" d={d} />
          ))}
          {DOTTED.map(([d, , , extra], n) => (
            <path key={d} className={`bp-dotted${extra ? ` ${extra}` : ""}`} mask={`url(#eon-bp-m${n})`} d={d} />
          ))}
          {MARKS.map(([d, start]) => (
            <path key={d} className="bp-fade bp-hair" style={at(start)} d={d} />
          ))}
          <circle className="bp-fade bp-hair" style={at(680)} cx={V[0]} cy={V[1]} r="3" />
          <text className="bp-fade" style={at(1150)} x="0" y="312" textAnchor="middle">⌀ 498</text>
          <g transform="rotate(-90 -306 0)">
            <text className="bp-fade" style={at(1190)} x="-306" y="0" textAnchor="middle">⌀ 330</text>
          </g>
          <text className="bp-fade" style={at(1230)} x="-76" y="72">30°</text>
          <text className="bp-fade" style={at(1270)} x={D[0] + DR + 8} y={D[1] - DR - 8}>⌀ 121</text>
          <text className="bp-fade" style={at(1310)} x={-M} y={-W - 8} textAnchor="middle">84</text>
        </g>

        {/* The finish: a faint chrome fill */}
        <g className="bp-fill">
          <path d={EON_MARK_PATH} />
          <circle cx={D[0]} cy={D[1]} r={DR} />
        </g>

        {/* The mark, traced over its construction by a point of light */}
        <path className="bp-mark" pathLength="1" d={EON_MARK_PATH} />
        <circle className="bp-markdot" cx={D[0]} cy={D[1]} r={DR} />
        <g className="bp-pen" style={{ offsetPath: `path("${EON_MARK_PATH}")` }}>
          <circle r="22" fill="url(#eon-bp-halo)" />
          <circle r="4.5" fill="#fff" />
        </g>
      </svg>
      <strong>Eon Design</strong>
      <span className="sr-only">{children}</span>
    </div>
  );
}
