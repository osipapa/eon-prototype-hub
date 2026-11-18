// Full-screen loading state, shared by the app splash (auth/chunk loads) and
// the hub's first data fetch. Behind the title, a dotted blueprint of the hub
// (sidebar, toolbar, canvas, comments) assembles piece by piece; a light
// sweeps across the title. The status line is for screen readers only.

// Each part enters from the side it lives on. `i` is its place in the stagger.
const at = (i) => ({ "--i": i });

export default function LoadingScreen({ children = "Loading…" }) {
  return (
    <div className="eon-loading-screen" role="status" aria-live="polite">
      <svg className="eon-loading-blueprint" viewBox="0 0 720 450" aria-hidden="true">
        <rect className="bp-fade" style={at(0)} x="0.5" y="0.5" width="719" height="449" rx="18" />

        {/* Sidebar */}
        <line className="bp-fade" style={at(1)} x1="150" y1="0.5" x2="150" y2="449.5" />
        <rect className="bp-left" style={at(2)} x="18" y="18" width="24" height="24" rx="7" />
        <rect className="bp-left" style={at(2)} x="52" y="24" width="64" height="12" rx="6" />
        <rect className="bp-left" style={at(3)} x="18" y="60" width="114" height="28" rx="9" />
        <rect className="bp-left" style={at(4)} x="18" y="106" width="114" height="22" rx="7" />
        <rect className="bp-left" style={at(5)} x="18" y="140" width="114" height="22" rx="7" />
        <rect className="bp-left" style={at(6)} x="18" y="174" width="114" height="22" rx="7" />
        <rect className="bp-left" style={at(7)} x="18" y="208" width="78" height="22" rx="7" />

        {/* Toolbar */}
        <line className="bp-fade" style={at(2)} x1="150" y1="56" x2="570" y2="56" />
        <rect className="bp-top" style={at(3)} x="170" y="20" width="96" height="16" rx="8" />
        <rect className="bp-top" style={at(4)} x="300" y="13" width="120" height="30" rx="15" />
        <circle className="bp-top" style={at(5)} cx="324" cy="28" r="7" />
        <circle className="bp-top" style={at(5)} cx="360" cy="28" r="7" />
        <circle className="bp-top" style={at(5)} cx="396" cy="28" r="7" />
        <rect className="bp-top" style={at(6)} x="478" y="13" width="72" height="30" rx="9" />

        {/* Comments */}
        <line className="bp-fade" style={at(3)} x1="570" y1="0.5" x2="570" y2="449.5" />
        <rect className="bp-right" style={at(4)} x="588" y="22" width="80" height="12" rx="6" />
        <rect className="bp-right" style={at(5)} x="588" y="58" width="114" height="58" rx="10" />
        <circle className="bp-right" style={at(5)} cx="604" cy="74" r="6" />
        <rect className="bp-right" style={at(6)} x="588" y="128" width="114" height="58" rx="10" />
        <circle className="bp-right" style={at(6)} cx="604" cy="144" r="6" />
        <rect className="bp-right" style={at(7)} x="588" y="198" width="114" height="58" rx="10" />
        <circle className="bp-right" style={at(7)} cx="604" cy="214" r="6" />

        {/* Canvas: the frame the title sits in, its registration marks and measure */}
        <rect className="bp-grow" style={at(6)} x="220" y="115" width="280" height="220" rx="16" />
        <path className="bp-fade bp-solid" style={at(8)} d="M206 115h8M210 111v8M506 115h8M510 111v8M206 335h8M210 331v8M506 335h8M510 331v8" />
        <path className="bp-fade bp-solid" style={at(9)} d="M220 352h280M220 347v10M500 347v10" />

        {/* State bar */}
        <rect className="bp-bottom" style={at(8)} x="290" y="378" width="140" height="34" rx="17" />
        <rect className="bp-bottom" style={at(9)} x="300" y="386" width="36" height="18" rx="9" />
        <rect className="bp-bottom" style={at(9)} x="342" y="386" width="36" height="18" rx="9" />
        <rect className="bp-bottom" style={at(9)} x="384" y="386" width="36" height="18" rx="9" />
      </svg>
      <strong>Eon Design</strong>
      <span className="sr-only">{children}</span>
    </div>
  );
}
