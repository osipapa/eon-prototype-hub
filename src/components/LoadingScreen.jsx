// Full-screen loading state, shared by the app splash (auth/chunk loads) and
// the hub's first data fetch. Above the title, the Eon mark is constructed
// like a logo sheet: axes, circles and guide lines assemble, then the mark is
// drawn over them. A light sweeps across the title. The status line is for
// screen readers only.

// Geometry of the mark, with the ring's centre at 0,0 (see public/favicon.svg).
// R/r: outer and inner ring radius. M: the band's centre line. W: half the
// band. The cut faces fan out 15 degrees either side of a 45 degree bisector
// from V; the dot (D, radius DR) sits on that bisector, and a circle of twice
// its radius touches both faces.
const R = 249;
const r = 165;
const M = 207;
const W = 42;
const V = [-166.7, 155.3];
const D = [156.2, -172.1];
const DR = 60.5;
const SQ = 116.7; // half side of the square inscribed in the inner circle
const MARK = "M 236.0 -77.3 L 161.2 -34.0 C 163.5 -23.1 164.7 -11.7 164.7 -0.0 C 164.7 58.3 134.4 109.8 88.6 139.1 C 63.0 155.6 32.6 165.1 0.0 165.1 C -90.8 165.1 -164.7 91.0 -164.7 -0.0 C -164.7 -44.6 -147.0 -85.1 -118.2 -114.9 C -88.3 -145.9 -46.4 -165.2 0.0 -165.2 C 6.0 -165.2 11.9 -164.9 17.8 -164.2 L 61.6 -240.3 L 61.8 -241.1 C 42.1 -246.2 21.3 -248.9 0.0 -248.9 C -77.3 -248.9 -146.4 -213.3 -192.0 -157.6 C -227.2 -114.6 -248.2 -59.7 -248.2 0.0 C -248.2 137.3 -136.9 248.9 0.0 248.9 C 47.8 248.9 92.5 235.3 130.4 211.7 C 201.1 167.8 248.2 89.3 248.2 0.0 C 248.2 -27.0 243.9 -52.9 235.9 -77.3 L 236.0 -77.3Z";

// `i` is a part's place in the stagger.
const at = (i) => ({ "--i": i });

export default function LoadingScreen({ children = "Loading…" }) {
  return (
    <div className="eon-loading-screen" role="status" aria-live="polite">
      <svg className="eon-loading-blueprint" viewBox="-330 -330 660 660" aria-hidden="true">
        {/* Axes, with ticks where the circles cross them */}
        <path className="bp bp-fade bp-solid" style={at(0)} d="M-318 0H318M0 -318V318" />
        <path
          className="bp bp-fade bp-solid"
          style={at(1)}
          d={[R, -R, r, -r, M, -M].map((x) => `M${x} -6V6M-6 ${x}H6`).join("")}
        />

        {/* Bounding square and its registration marks */}
        <rect className="bp bp-grow" style={at(1)} x={-R} y={-R} width={R * 2} height={R * 2} />
        <path
          className="bp bp-fade bp-solid"
          style={at(2)}
          d={[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => `M${sx * (R + 20) - 7} ${sy * (R + 20)}h14M${sx * (R + 20)} ${sy * (R + 20) - 7}v14`).join("")}
        />

        {/* The ring: outer, inner and centre-line circles */}
        <circle className="bp bp-grow" style={at(2)} r={R} />
        <circle className="bp bp-grow" style={at(3)} r={r} />
        <circle className="bp bp-grow bp-centerline" style={at(4)} r={M} />

        {/* Band circles: the ring is one circle thick all the way round */}
        <circle className="bp bp-grow" style={at(5)} cx={M} r={W} />
        <circle className="bp bp-grow" style={at(5)} cy={M} r={W} />
        <circle className="bp bp-grow" style={at(6)} cx={-M} r={W} />
        <circle className="bp bp-grow" style={at(6)} cy={-M} r={W} />

        {/* Square in the inner circle, and the diagonal square to the cut */}
        <rect className="bp bp-grow" style={at(7)} x={-SQ} y={-SQ} width={SQ * 2} height={SQ * 2} />
        <path className="bp bp-fade bp-solid" style={at(7)} d={`M${-R} ${-R}L${R} ${R}`} />

        {/* The cut: two faces and their bisector from V, with the angle between */}
        <path
          className="bp bp-fade bp-solid"
          style={at(8)}
          d={`M${V[0]} ${V[1]}L318.3 -124.7M${V[0]} ${V[1]}L257.6 -269M${V[0]} ${V[1]}L103.3 -312.4`}
        />
        <path className="bp bp-fade bp-solid" style={at(9)} d="M-121.7 77.4A90 90 0 0 1 -88.8 110.3" />
        <circle className="bp bp-fade bp-solid" style={at(9)} cx={V[0]} cy={V[1]} r="3" />

        {/* The dot: its square, its axes, and the circle that touches both faces */}
        <rect className="bp bp-grow" style={at(10)} x={D[0] - DR} y={D[1] - DR} width={DR * 2} height={DR * 2} />
        <path className="bp bp-fade bp-solid" style={at(10)} d={`M${D[0] - 80} ${D[1]}h160M${D[0]} ${D[1] - 80}v160`} />
        <circle className="bp bp-grow" style={at(11)} cx={D[0]} cy={D[1]} r={DR * 2} />

        {/* Measures */}
        <path className="bp bp-fade bp-solid" style={at(12)} d={`M${-R} 291H${R}M${-R} 284v14M${R} 284v14`} />
        <path className="bp bp-fade bp-solid" style={at(12)} d={`M-291 ${-r}V${r}M-298 ${-r}h14M-298 ${r}h14`} />
        <text className="bp bp-fade" style={at(13)} x="0" y="312" textAnchor="middle">⌀ 498</text>
        <g transform="rotate(-90 -306 0)">
          <text className="bp bp-fade" style={at(13)} x="-306" y="0" textAnchor="middle">⌀ 330</text>
        </g>
        <text className="bp bp-fade" style={at(13)} x="-76" y="72">30°</text>
        <text className="bp bp-fade" style={at(13)} x={D[0] + DR + 8} y={D[1] - DR - 8}>⌀ 121</text>
        <text className="bp bp-fade" style={at(13)} x={-M} y={-W - 8} textAnchor="middle">84</text>

        {/* The mark itself, drawn over its construction */}
        <path className="bp-mark bp-draw" style={at(12)} pathLength="1" d={MARK} />
        <circle className="bp-mark bp bp-grow" style={at(24)} cx={D[0]} cy={D[1]} r={DR} />
      </svg>
      <strong>Eon Design</strong>
      <span className="sr-only">{children}</span>
    </div>
  );
}
