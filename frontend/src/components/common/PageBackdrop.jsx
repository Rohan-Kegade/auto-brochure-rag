// Decorative glow + pattern layer; place inside a `relative isolate` container.
// "grid" is the app-wide default; "glow" is the colour glows alone; "print" is
// the landing page's dot screen with registration marks, like a brochure proof.
export function PageBackdrop({ className = "inset-0", pattern = "grid" }) {
  const print = pattern === "print";

  return (
    <div className={`pointer-events-none absolute -z-10 overflow-hidden ${className}`} aria-hidden="true">
      <div className={`absolute inset-0 backdrop-glow ${print ? "backdrop-drift" : ""}`} />
      {pattern !== "glow" && (
        <div className={`absolute inset-0 ${print ? "backdrop-dots" : "backdrop-grid"}`} />
      )}
      {print && (
        <>
          <RegistrationMark className="absolute top-28 left-[3%]" />
          <RegistrationMark className="absolute top-[34rem] right-[3%]" />
        </>
      )}
    </div>
  );
}

function RegistrationMark({ className }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`hidden xl:block w-10 h-10 text-slate-300 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <circle cx="20" cy="20" r="9" />
      <circle cx="20" cy="20" r="4" />
      <path d="M20 2v36M2 20h36" />
    </svg>
  );
}
