import { useId } from "react";

// The Eon mark as a vector: a ring with one cut and a dot in it. Coordinates
// have the ring's centre at 0,0 (the same shape as public/favicon.svg), so the
// loading screen can draw its construction lines around the same geometry.
export const EON_MARK_PATH = "M 236.0 -77.3 L 161.2 -34.0 C 163.5 -23.1 164.7 -11.7 164.7 -0.0 C 164.7 58.3 134.4 109.8 88.6 139.1 C 63.0 155.6 32.6 165.1 0.0 165.1 C -90.8 165.1 -164.7 91.0 -164.7 -0.0 C -164.7 -44.6 -147.0 -85.1 -118.2 -114.9 C -88.3 -145.9 -46.4 -165.2 0.0 -165.2 C 6.0 -165.2 11.9 -164.9 17.8 -164.2 L 61.6 -240.3 L 61.8 -241.1 C 42.1 -246.2 21.3 -248.9 0.0 -248.9 C -77.3 -248.9 -146.4 -213.3 -192.0 -157.6 C -227.2 -114.6 -248.2 -59.7 -248.2 0.0 C -248.2 137.3 -136.9 248.9 0.0 248.9 C 47.8 248.9 92.5 235.3 130.4 211.7 C 201.1 167.8 248.2 89.3 248.2 0.0 C 248.2 -27.0 243.9 -52.9 235.9 -77.3 L 236.0 -77.3Z";
export const EON_MARK_DOT = { cx: 156.2, cy: -172.1, r: 60.5 };

// The mark as an app-icon tile, in the style of a blueprint: a black glass tile,
// a grid with one guide circle behind, and the mark filled solid on top. The
// glass is drawn, not filtered: the grid is redrawn at a different scale in the
// bevel band and inside the lens, so the lines jog where the glass bends. Ids
// are namespaced with useId so more than one tile can sit on a page.
export function EonBlueprintTile({ size = 30, className }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="-256 -256 512 512" width={size} height={size} fill="none" aria-hidden="true">
      <defs>
      <clipPath id={`${id}c`}><path d="M-138 -256H138A118 118 0 0 1 256 -138V138A118 118 0 0 1 138 256H-138A118 118 0 0 1 -256 138V-138A118 118 0 0 1 -138 -256Z" /></clipPath>
      <clipPath id={`${id}b`}><path clipRule="evenodd" d="M-138 -256H138A118 118 0 0 1 256 -138V138A118 118 0 0 1 138 256H-138A118 118 0 0 1 -256 138V-138A118 118 0 0 1 -138 -256ZM-134 -222H134A88 88 0 0 1 222 -134V134A88 88 0 0 1 134 222H-134A88 88 0 0 1 -222 134V-134A88 88 0 0 1 -134 -222Z" /></clipPath>
      <clipPath id={`${id}f`}><path clipRule="evenodd" d="M-134 -222H134A88 88 0 0 1 222 -134V134A88 88 0 0 1 134 222H-134A88 88 0 0 1 -222 134V-134A88 88 0 0 1 -134 -222ZM-206 0A206 206 0 1 0 206 0A206 206 0 1 0 -206 0Z" /></clipPath>
      <clipPath id={`${id}l`}><path d="M-206 0A206 206 0 1 0 206 0A206 206 0 1 0 -206 0Z" /></clipPath>
      <linearGradient id={`${id}t`} x1="0" y1="-256" x2="0" y2="256" gradientUnits="userSpaceOnUse"><stop stopColor="#1C1E22" /><stop offset="1" stopColor="#000" /></linearGradient>
      <radialGradient id={`${id}g`} cx="0" cy="0" r="230" gradientUnits="userSpaceOnUse"><stop stopColor="#AEB6C2" stopOpacity=".3" /><stop offset="1" stopColor="#AEB6C2" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}e`} x1="-256" y1="-256" x2="256" y2="256" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".16" /><stop offset=".5" stopColor="#fff" stopOpacity=".03" /><stop offset="1" stopColor="#fff" stopOpacity=".1" /></linearGradient>
      <radialGradient id={`${id}d`} cx="-80" cy="-110" r="330" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".2" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}m`} x1="-150" y1="-150" x2="150" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#AEB6C2" /></linearGradient>
      <linearGradient id={`${id}r`} x1="0" y1="-256" x2="0" y2="256" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".38" /><stop offset="1" stopColor="#fff" stopOpacity=".08" /></linearGradient>
      </defs>
      <path d="M-138 -256H138A118 118 0 0 1 256 -138V138A118 118 0 0 1 138 256H-138A118 118 0 0 1 -256 138V-138A118 118 0 0 1 -138 -256Z" fill={`url(#${id}t)`} />
      <g clipPath={`url(#${id}c)`} stroke="#C9D2DE" strokeOpacity=".34" strokeWidth="7">
      <circle r="230" fill={`url(#${id}g)`} stroke="none" />
      <g clipPath={`url(#${id}b)`}><path d="M-138 -256H138A118 118 0 0 1 256 -138V138A118 118 0 0 1 138 256H-138A118 118 0 0 1 -256 138V-138A118 118 0 0 1 -138 -256Z" fill={`url(#${id}e)`} stroke="none" /><path transform="scale(.88)" strokeWidth="8.0" d="M-128 -256V256M0 -256V256M128 -256V256M-256 -128H256M-256 0H256M-256 128H256" /></g>
      <g clipPath={`url(#${id}f)`}><path d="M-128 -256V256M0 -256V256M128 -256V256M-256 -128H256M-256 0H256M-256 128H256" /></g>
      <g clipPath={`url(#${id}l)`}><path d="M-206 0A206 206 0 1 0 206 0A206 206 0 1 0 -206 0Z" fill={`url(#${id}d)`} stroke="none" /><path transform="scale(1.12)" strokeWidth="6.2" d="M-128 -256V256M0 -256V256M128 -256V256M-256 -128H256M-256 0H256M-256 128H256" /></g>
      <path d="M-206 0A206 206 0 1 0 206 0A206 206 0 1 0 -206 0Z" />
      <path d="M-134 -222H134A88 88 0 0 1 222 -134V134A88 88 0 0 1 134 222H-134A88 88 0 0 1 -222 134V-134A88 88 0 0 1 -134 -222Z" stroke="#fff" strokeOpacity=".14" strokeWidth="4.9" />
      <g transform="scale(0.6)" fill={`url(#${id}m)`} stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="8" strokeLinejoin="round"><path d={EON_MARK_PATH} /><circle {...EON_MARK_DOT} /></g>
      <path d="M-138 -250H138A112 112 0 0 1 250 -138V138A112 112 0 0 1 138 250H-138A112 112 0 0 1 -250 138V-138A112 112 0 0 1 -138 -250Z" stroke={`url(#${id}r)`} strokeOpacity="1" strokeWidth="12" />
      </g>
    </svg>
  );
}

// The mark as an outline only, in the current text colour, for small sizes
// where construction lines would not read.
export function EonMarkOutline({ size = 30, className }) {
  return (
    <svg className={className} viewBox="-268 -268 536 536" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="round" aria-hidden="true">
      <path d={EON_MARK_PATH} />
      <circle {...EON_MARK_DOT} />
    </svg>
  );
}
