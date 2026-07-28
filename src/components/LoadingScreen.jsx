import { readCachedEonLogo } from "@/lib/branding";

// Full-screen branded loading state, shared by the app splash (auth/chunk
// loads) and the hub's first data fetch. Uses the cached workspace logo when
// one has been seen on this device; falls back to the built-in mark.
export default function LoadingScreen({ children = "Loading…" }) {
  const logo = readCachedEonLogo();
  return (
    <div className="eon-loading-screen" role="status" aria-live="polite">
      <div className="eon-loading-mark">
        {logo ? (
          <img src={logo} alt="" />
        ) : (
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
            <path d="M12 4 A8 8 0 0 1 12 20" stroke="#EDD2F6" strokeWidth="2" />
          </svg>
        )}
      </div>
      <strong>Eon Design Hub</strong>
      <div className="eon-loading-bar" aria-hidden="true"><span /></div>
      <span className="eon-loading-status">{children}</span>
    </div>
  );
}
