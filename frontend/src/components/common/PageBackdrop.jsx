// Decorative glow + pattern layer; place inside a `relative isolate` container.
// "grid" is the app-wide default; "glow" is the colour glows alone; "print" is
// the landing page's blueprint: graph paper with a technical drawing of a car,
// plus registration marks, like a brochure proof.
export function PageBackdrop({ className = "inset-0", pattern = "grid" }) {
  const print = pattern === "print";

  return (
    <div className={`pointer-events-none absolute -z-10 overflow-hidden ${className}`} aria-hidden="true">
      <div className={`absolute inset-0 backdrop-glow ${print ? "backdrop-drift" : ""}`} />
      {pattern !== "glow" && (
        <div className={`absolute inset-0 ${print ? "backdrop-graph" : "backdrop-grid"}`} />
      )}
      {print && (
        <>
          <BlueprintDrawing />
          <RegistrationMark className="absolute top-28 left-[3%]" />
          <RegistrationMark className="absolute top-[34rem] right-[3%]" />
        </>
      )}
    </div>
  );
}

// Side view of a car with its dimensions, as on a brochure's spec page. The
// figures match the Norra Cross used in the landing page demo.
function BlueprintDrawing() {
  return (
    <svg
      viewBox="0 0 140 72"
      className="blueprint-drawing hidden md:block absolute left-1/2 top-36 w-[68rem] max-w-none -translate-x-1/2"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.3"
    >
      <g transform="translate(8 4)">
        <path d="M6 33c0-3.5 2.2-5.5 6-6.2L30 23.5l13.5-10.6c2-1.6 4.4-2.4 7-2.4H78c3.4 0 6.3 1.3 8.7 3.6l9.8 9.4 13.4 2.6c3.8.7 6.1 3.3 6.1 7v3.7c0 1.4-1 2.2-2.4 2.2h-9.3a10 10 0 0 0-19.6 0H37.9a10 10 0 0 0-19.6 0H8.2C6.9 39 6 38.1 6 36.8z" />
        <path d="M47.5 14.5h17.5v9H37zM68.5 14.5H78c2.3 0 4.3.9 6 2.5l6.4 6.5H68.5z" />
        <circle cx="28" cy="38" r="7.2" />
        <circle cx="28" cy="38" r="3" />
        <circle cx="96" cy="38" r="7.2" />
        <circle cx="96" cy="38" r="3" />
        {/* centre lines */}
        <path d="M28 26v24M96 26v24M18 38h20M86 38h20" strokeDasharray="1 1" />
        {/* wheelbase */}
        <path d="M28 47v8M96 47v8M28 53h68" />
        <path d="M28 53l2-1v2zM96 53l-2-1v2z" fill="currentColor" />
        {/* overall length */}
        <path d="M6 41v20M116 41v20M6 59h110" />
        <path d="M6 59l2-1v2zM116 59l-2-1v2z" fill="currentColor" />
        {/* height */}
        <path d="M112 10.5h10M118 45h4M120 10.5v34.5" />
        <path d="M120 10.5l-1 2h2zM120 45l-1-2h2z" fill="currentColor" />
      </g>
      <g stroke="none" fill="currentColor" fontSize="2.4" letterSpacing="0.3">
        <text x="70" y="55.5" textAnchor="middle">WHEELBASE 2,610 MM</text>
        <text x="69" y="66.5" textAnchor="middle">OVERALL LENGTH 4,312 MM</text>
        <text x="131.5" y="31" textAnchor="middle" transform="rotate(-90 131.5 31)">HEIGHT 1,620 MM</text>
      </g>
    </svg>
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
