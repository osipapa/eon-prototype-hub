// Full-screen loading state, shared by the app splash (auth/chunk loads) and
// the hub's first data fetch: the title alone, with a light sweeping across
// it. The status line is for screen readers only.
export default function LoadingScreen({ children = "Loading…" }) {
  return (
    <div className="eon-loading-screen" role="status" aria-live="polite">
      <strong>Eon Design</strong>
      <span className="sr-only">{children}</span>
    </div>
  );
}
