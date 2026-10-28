const ROWS = [
  [
    "Does the base variant get rear AC vents?",
    "What's the ground clearance?",
    "Which trims get a sunroof?",
    "Turbo petrol or diesel: which is quicker?",
    "Is wireless charging standard?",
    "How many airbags on the mid variant?",
    "What's the claimed mileage?",
  ],
  [
    "Compare boot space across all three",
    "What tyre size does the top trim use?",
    "Which one has the longest warranty?",
    "Does it get ADAS on the automatic?",
    "What colours is it offered in?",
    "Is there a 7-seat version?",
    "Which variant is the best value?",
  ],
];

// Two rows of example questions drifting in opposite directions.
export function QuestionTicker() {
  return (
    <section aria-label="Questions you can ask" className="py-8 border-y border-slate-200 bg-white/60">
      <p className="mb-5 px-4 text-center text-[11px] uppercase tracking-[0.22em] text-slate-400">
        Ask it the way you'd ask the salesperson
      </p>
      <div className="space-y-3">
        {ROWS.map((questions, row) => (
          <div key={row} className="ticker">
            <div className={`ticker-track ${row % 2 ? "ticker-reverse" : ""}`}>
              {/* the list is doubled so the loop is seamless */}
              {[...questions, ...questions].map((q, i) => (
                <span
                  key={i}
                  aria-hidden={i >= questions.length || undefined}
                  className="ticker-item inline-flex items-center gap-2 mr-3 px-3.5 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 whitespace-nowrap"
                >
                  <span className="text-[10px] font-bold text-indigo-500">Q</span>
                  {q}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
