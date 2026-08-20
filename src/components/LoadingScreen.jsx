import { readCachedEonLogo } from "@/lib/branding";
import EonMark from "@/components/EonMark";

// Full-screen branded loading state, shared by the app splash (auth/chunk
// loads) and the hub's first data fetch. Uses the cached workspace logo when
// one has been seen on this device; otherwise keeps its place with a skeleton.
export default function LoadingScreen({ children = "Loading…" }) {
  const logo = readCachedEonLogo();
  return (
    <div className="eon-loading-screen" role="status" aria-live="polite">
      <div className="eon-loading-mark">
        <EonMark src={logo} className="eon-loading-logo" size={34} loading />
      </div>
      <strong>Eon Design Hub</strong>
      <div className="eon-loading-bar" aria-hidden="true"><span /></div>
      <span className="eon-loading-status">{children}</span>
    </div>
  );
}
