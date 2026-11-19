import { useId } from "react";

// The Eon mark as a vector: a ring with one cut and a dot in it. Coordinates
// have the ring's centre at 0,0 (the same shape as public/favicon.svg), so the
// loading screen can draw its construction lines around the same geometry.
export const EON_MARK_PATH = "M 236.0 -77.3 L 161.2 -34.0 C 163.5 -23.1 164.7 -11.7 164.7 -0.0 C 164.7 58.3 134.4 109.8 88.6 139.1 C 63.0 155.6 32.6 165.1 0.0 165.1 C -90.8 165.1 -164.7 91.0 -164.7 -0.0 C -164.7 -44.6 -147.0 -85.1 -118.2 -114.9 C -88.3 -145.9 -46.4 -165.2 0.0 -165.2 C 6.0 -165.2 11.9 -164.9 17.8 -164.2 L 61.6 -240.3 L 61.8 -241.1 C 42.1 -246.2 21.3 -248.9 0.0 -248.9 C -77.3 -248.9 -146.4 -213.3 -192.0 -157.6 C -227.2 -114.6 -248.2 -59.7 -248.2 0.0 C -248.2 137.3 -136.9 248.9 0.0 248.9 C 47.8 248.9 92.5 235.3 130.4 211.7 C 201.1 167.8 248.2 89.3 248.2 0.0 C 248.2 -27.0 243.9 -52.9 235.9 -77.3 L 236.0 -77.3Z";
export const EON_MARK_DOT = { cx: 156.2, cy: -172.1, r: 60.5 };

// The mark as an app-icon tile, in the style of a blueprint: a dark glass tile,
// a grid with one guide circle behind, and the mark filled solid on top. Ids
// are namespaced with useId so more than one tile can sit on a page.
export function EonBlueprintTile({ size = 30, className }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="-256 -256 512 512" width={size} height={size} fill="none" aria-hidden="true">
      <defs>
        <clipPath id={`${id}c`}><rect x="-256" y="-256" width="512" height="512" rx="118" /></clipPath>
        <linearGradient id={`${id}t`} x1="0" y1="-256" x2="0" y2="256" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C1E22" /><stop offset="1" stopColor="#000" />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="0" cy="0" r="230" gradientUnits="userSpaceOnUse">
          <stop stopColor="#AEB6C2" stopOpacity=".3" /><stop offset="1" stopColor="#AEB6C2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}m`} x1="-150" y1="-150" x2="150" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#AEB6C2" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="-256" x2="0" y2="256" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".38" /><stop offset="1" stopColor="#fff" stopOpacity=".08" />
        </linearGradient>
      </defs>
      <rect x="-256" y="-256" width="512" height="512" rx="118" fill={`url(#${id}t)`} />
      <g clipPath={`url(#${id}c)`}>
        <circle r="230" fill={`url(#${id}g)`} />
        <path stroke="#C9D2DE" strokeOpacity=".34" strokeWidth="7" d="M-128 -256V256M0 -256V256M128 -256V256M-256 -128H256M-256 0H256M-256 128H256" />
        <circle r="206" stroke="#C9D2DE" strokeOpacity=".34" strokeWidth="7" />
        <g transform="scale(.6)" fill={`url(#${id}m)`} stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="8" strokeLinejoin="round">
          <path d={EON_MARK_PATH} />
          <circle {...EON_MARK_DOT} />
        </g>
        <rect x="-250" y="-250" width="500" height="500" rx="112" stroke={`url(#${id}r)`} strokeWidth="12" />
      </g>
    </svg>
  );
}

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
