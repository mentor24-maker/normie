/**
 * Shared route-segment loading UI rendered by loading.tsx boundaries while
 * a server page's data streams in. Keep it lightweight: it paints for the
 * gap between navigation and the segment resolving.
 */
export function RouteLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div aria-live="polite" className="route-loading" role="status">
      <span className="route-loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="route-loading-label">{label}…</span>
    </div>
  );
}
