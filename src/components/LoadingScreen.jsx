import { useState } from "react";
import { loaderElapsed } from "@/lib/loaderClock";
import { EON_MARK_DOT, EON_MARK_PATH } from "@/components/EonGlyph";

// Full-screen loading state, shared by the app splash (auth/chunk loads) and
// the hub's first data fetch. Above the title, the Eon mark is drafted like a
// logo sheet: axes shoot out from the centre, circles are swept round as if by
// a compass, guides and measures extend. Then the mark fades in over them as a
// strong outline and the guides recede. That plays once per page load (see
// loaderClock, which also keeps this screen up until it has finished); after
// it, the title pulses for as long as loading lasts. The status line is for
// screen readers.

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
  [circle(0, 0, R, -90), 60, 700],
  [circle(0, 0, r, 90, true), 130, 650],
  [rect(-R, -R, R * 2, R * 2), 190, 650],
  [circle(0, 0, M, 180), 260, 650, "bp-centerline"],
  [circle(M, 0, W, 0), 340, 400],
  [circle(0, M, W, 90), 370, 400],
  [circle(-M, 0, W, 180), 400, 400],
  [circle(0, -M, W, -90), 430, 400],
  [rect(-SQ, -SQ, SQ * 2, SQ * 2), 450, 450],
  [rect(D[0] - DR, D[1] - DR, DR * 2, DR * 2), 660, 400],
  [circle(D[0], D[1], DR * 2, -45), 720, 500],
];

// Solid hairlines draw themselves: axes from the centre out, the diagonal,
// the cut's two faces and bisector from V, the angle arc, the dot's axes, and
// the two measure lines.
const LINES = [
  ["M0 0H318", 0, 450],
  ["M0 0H-318", 0, 450],
  ["M0 0V318", 0, 450],
  ["M0 0V-318", 0, 450],
  [`M${-R} ${-R}L${R} ${R}`, 480, 450],
  [`M${V[0]} ${V[1]}L318.3 -124.7`, 540, 400],
  [`M${V[0]} ${V[1]}L257.6 -269`, 580, 400],
  [`M${V[0]} ${V[1]}L103.3 -312.4`, 620, 400],
  ["M-121.7 77.4A90 90 0 0 1 -88.8 110.3", 720, 300],
  [`M${D[0] - 80} ${D[1]}h160`, 690, 350],
  [`M${D[0]} ${D[1] - 80}v160`, 720, 350],
  [`M${-R} 291H${R}`, 780, 400],
  [`M-291 ${-r}V${r}`, 820, 400],
];

// Small marks fade in: ticks where the circles cross the axes, registration
// crosses at the square's corners, and the measures' end ticks.
const MARKS = [
  [[R, -R, r, -r, M, -M].map((x) => `M${x} -6V6M-6 ${x}H6`).join(""), 300],
  [[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => `M${sx * (R + 20) - 7} ${sy * (R + 20)}h14M${sx * (R + 20)} ${sy * (R + 20) - 7}v14`).join(""), 420],
  [`M${-R} 284v14M${R} 284v14M-298 ${-r}h14M-298 ${r}h14`, 880],
];

const at = (start, duration) => ({ "--d": `${start}ms`, ...(duration ? { "--dur": `${duration}ms` } : {}) });

export default function LoadingScreen({ children = "Loading…" }) {
  const [elapsed] = useState(loaderElapsed);
  return (
    <div className="eon-loading-screen" role="status" aria-live="polite" style={{ "--t0": `${-elapsed}ms` }}>
      <svg className="eon-loading-blueprint" viewBox="-330 -330 660 660" aria-hidden="true">
        <defs>
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
          <circle className="bp-fade bp-hair" style={at(540)} cx={V[0]} cy={V[1]} r="3" />
          <text className="bp-fade" style={at(920)} x="0" y="312" textAnchor="middle">⌀ 498</text>
          <g transform="rotate(-90 -306 0)">
            <text className="bp-fade" style={at(950)} x="-306" y="0" textAnchor="middle">⌀ 330</text>
          </g>
          <text className="bp-fade" style={at(980)} x="-76" y="72">30°</text>
          <text className="bp-fade" style={at(1010)} x={D[0] + DR + 8} y={D[1] - DR - 8}>⌀ 121</text>
          <text className="bp-fade" style={at(1040)} x={-M} y={-W - 8} textAnchor="middle">84</text>
        </g>

        {/* The mark fades in over its construction as a strong outline */}
        <g className="bp-mark">
          <path d={EON_MARK_PATH} />
          <circle cx={D[0]} cy={D[1]} r={DR} />
        </g>
      </svg>
      <strong>Eon Design</strong>
      <span className="sr-only">{children}</span>
    </div>
  );
}
