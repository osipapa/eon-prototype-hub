// The Eon mark as a vector: a ring with one cut and a dot in it. Coordinates
// have the ring's centre at 0,0 (the same shape as public/favicon.svg), so the
// loading screen can draw its construction lines around the same geometry.
export const EON_MARK_PATH = "M 236.0 -77.3 L 161.2 -34.0 C 163.5 -23.1 164.7 -11.7 164.7 -0.0 C 164.7 58.3 134.4 109.8 88.6 139.1 C 63.0 155.6 32.6 165.1 0.0 165.1 C -90.8 165.1 -164.7 91.0 -164.7 -0.0 C -164.7 -44.6 -147.0 -85.1 -118.2 -114.9 C -88.3 -145.9 -46.4 -165.2 0.0 -165.2 C 6.0 -165.2 11.9 -164.9 17.8 -164.2 L 61.6 -240.3 L 61.8 -241.1 C 42.1 -246.2 21.3 -248.9 0.0 -248.9 C -77.3 -248.9 -146.4 -213.3 -192.0 -157.6 C -227.2 -114.6 -248.2 -59.7 -248.2 0.0 C -248.2 137.3 -136.9 248.9 0.0 248.9 C 47.8 248.9 92.5 235.3 130.4 211.7 C 201.1 167.8 248.2 89.3 248.2 0.0 C 248.2 -27.0 243.9 -52.9 235.9 -77.3 L 236.0 -77.3Z";
export const EON_MARK_DOT = { cx: 156.2, cy: -172.1, r: 60.5 };

// The mark as an outline only, in the current text colour, for small sizes
// where construction lines would not read. public/favicon.svg is the same
// drawing with a heavier stroke; it picks dark or light lines from the
// browser's colour scheme.
export function EonMarkOutline({ size = 30, className }) {
  return (
    <svg className={className} viewBox="-268 -268 536 536" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="round" aria-hidden="true">
      <path d={EON_MARK_PATH} />
      <circle {...EON_MARK_DOT} />
    </svg>
  );
}
