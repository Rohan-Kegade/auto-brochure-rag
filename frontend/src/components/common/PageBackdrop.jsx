// Decorative glow + grid layer; place inside a `relative isolate` container.
export function PageBackdrop({ className = "inset-0" }) {
  return (
    <div className={`pointer-events-none absolute -z-10 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0 backdrop-glow" />
      <div className="absolute inset-0 backdrop-grid" />
    </div>
  );
}
