import { useEffect, useState } from "react";
import { ArrowUp, FileText, Search } from "lucide-react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const BROCHURE = "Norra Cross 2026";

// Each scenario is one turn of the demo: the question, the brochure page the
// answer is found on, which rows on that page it comes from, and the answer.
const SCENARIOS = [
  {
    tab: "Airbags",
    question: "Does the base variant get 6 airbags?",
    page: 14,
    section: "Safety & security",
    rows: [
      ["Airbags", "6, all variants"],
      ["ESC with hill-hold", "Standard"],
      ["ISOFIX anchors", "Rear outer seats"],
      ["360° camera", "ZX+ only"],
      ["ADAS (Level 2)", "ZX+ only"],
    ],
    hits: [0, 1],
    answer: (
      <>
        Yes. <strong>Every variant</strong>, including the base E trim, gets{" "}
        <strong>6 airbags</strong> as standard, along with ESC and hill-hold.
      </>
    ),
  },
  {
    tab: "Boot space",
    question: "How much boot space with the rear seats folded?",
    page: 22,
    section: "Dimensions & capacity",
    rows: [
      ["Length", "4,312 mm"],
      ["Wheelbase", "2,610 mm"],
      ["Ground clearance", "208 mm"],
      ["Boot, seats up", "433 L"],
      ["Boot, seats folded", "1,050 L"],
    ],
    hits: [3, 4],
    answer: (
      <>
        Up to <strong>1,050 litres</strong> with the rear seats folded, compared
        with <strong>433 L</strong> when they're up.
      </>
    ),
  },
  {
    tab: "Sunroof",
    question: "Which trims get the panoramic sunroof?",
    page: 31,
    section: "Variants & features",
    rows: [
      ["Alloy wheels", '17", SX and above'],
      ["Wireless charging", "SX and above"],
      ["Panoramic sunroof", "ZX, ZX+"],
      ["Ventilated seats", "ZX+ only"],
      ["Ambient lighting", "ZX+ only"],
    ],
    hits: [2],
    answer: (
      <>
        Only the top two trims, <strong>ZX</strong> and <strong>ZX+</strong>. It
        isn't listed for the E or SX.
      </>
    ),
  },
];

const TYPE_MS = 34;
const TYPED_PAUSE_MS = 350;
const SEARCH_MS = 1500;
const HOLD_MS = 5200;

const cycleMs = (scenario) =>
  scenario.question.length * TYPE_MS + TYPED_PAUSE_MS + SEARCH_MS + HOLD_MS;

// Self-playing mock of a chat turn: the question types itself, the brochure
// page is scanned, the matching rows light up and the answer cites the page.
export function HeroDemo() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("typing"); // typing | searching | answer
  const [typed, setTyped] = useState(0);
  const [run, setRun] = useState(0); // restarts the tab progress bar

  const scenario = SCENARIOS[index];

  useEffect(() => {
    if (reduced) return;
    let timer;
    if (phase === "typing") {
      timer =
        typed < scenario.question.length
          ? setTimeout(() => setTyped(typed + 1), TYPE_MS)
          : setTimeout(() => setPhase("searching"), TYPED_PAUSE_MS);
    } else if (phase === "searching") {
      timer = setTimeout(() => setPhase("answer"), SEARCH_MS);
    } else {
      timer = setTimeout(() => {
        setIndex((index + 1) % SCENARIOS.length);
        setTyped(0);
        setPhase("typing");
        setRun((r) => r + 1);
      }, HOLD_MS);
    }
    return () => clearTimeout(timer);
  }, [reduced, phase, typed, index, scenario]);

  const select = (i) => {
    setIndex(i);
    setTyped(0);
    setPhase("typing");
    setRun((r) => r + 1);
  };

  // With reduced motion every scenario is shown already answered.
  const shownPhase = reduced ? "answer" : phase;
  const question = reduced ? scenario.question : scenario.question.slice(0, typed);

  return (
    <div id="demo" className="relative scroll-mt-24" aria-label="Example of BrochureIQ answering a question">
      <CropMarks />

      <div aria-hidden="true">
        <BrochurePage key={index} scenario={scenario} phase={shownPhase} />

        <div className="relative z-10 -mt-20 sm:-mt-24 ml-auto w-[94%] sm:w-[84%]">
          <ChatCard scenario={scenario} phase={shownPhase} question={question} typing={!reduced && phase === "typing"} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2" role="tablist" aria-label="Example questions">
        {SCENARIOS.map((s, i) => {
          const active = i === index;
          return (
            <button
              key={s.tab}
              role="tab"
              aria-selected={active}
              onClick={() => select(i)}
              className={`relative overflow-hidden px-3 py-2 text-left text-xs rounded-lg border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active
                  ? "bg-white border-indigo-200 text-indigo-700"
                  : "bg-white/50 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">Q{i + 1}</span>
              <span className="block font-medium truncate">{s.tab}</span>
              {active && (
                <span
                  key={run}
                  className={`absolute left-0 bottom-0 h-0.5 w-full bg-linear-to-r from-indigo-500 to-violet-500 ${reduced ? "" : "demo-progress"}`}
                  style={reduced ? undefined : { animationDuration: `${cycleMs(s)}ms` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BrochurePage({ scenario, phase }) {
  const found = phase === "answer";

  return (
    <div className="relative mr-6 sm:mr-14">
      {/* the page underneath, peeking out like a stack of printouts */}
      <div className="absolute inset-0 translate-x-4 translate-y-3 rotate-[3.5deg] bg-white border border-slate-200 rounded-xl shadow-md" />

      <div className="relative bg-white border border-slate-200 rounded-xl shadow-xl shadow-indigo-900/10 overflow-hidden sm:-rotate-[1.5deg] animate-[fadeIn_0.45s_ease-out]">
        <div className="h-12 px-4 flex items-center justify-between bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 text-white">
          <span className="font-display text-sm font-semibold tracking-[0.12em] uppercase">Norra Cross</span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums transition-colors duration-300 ${
              found ? "hit-tag" : "bg-[rgb(255_255_255/0.18)] text-white"
            }`}
          >
            p. {scenario.page}
          </span>
        </div>

        <div className="relative px-4 pt-4 pb-28 sm:pb-32">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{scenario.section}</p>
          <dl className="mt-3 space-y-0.5">
            {scenario.rows.map(([label, value], i) => (
              <div
                key={label}
                className={`demo-row flex items-baseline justify-between gap-3 px-2 py-1.5 text-xs ${
                  found && scenario.hits.includes(i) ? "is-hit" : ""
                }`}
              >
                <dt className="text-slate-500 truncate">{label}</dt>
                <dd className="font-medium text-slate-800 text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {/* body copy as grey bars, partly covered by the chat card */}
          <div className="mt-5 space-y-2">
            <div className="h-1.5 w-11/12 rounded-full bg-slate-100" />
            <div className="h-1.5 w-10/12 rounded-full bg-slate-100" />
            <div className="h-1.5 w-7/12 rounded-full bg-slate-100" />
          </div>
        </div>

        {phase === "searching" && <div className="scan-line" />}
      </div>
    </div>
  );
}

function ChatCard({ scenario, phase, question, typing }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-indigo-900/15 overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[11px] min-w-0">
          <FileText className="w-3 h-3 shrink-0" />
          <span className="truncate">{BROCHURE}.pdf</span>
        </span>
        <span className="flex gap-1 shrink-0">
          <span className="w-2 h-2 rounded-full bg-slate-200" />
          <span className="w-2 h-2 rounded-full bg-slate-200" />
          <span className="w-2 h-2 rounded-full bg-slate-200" />
        </span>
      </div>

      <div className="p-3.5 space-y-3 bg-slate-50 min-h-56">
        <div className="flex justify-end">
          <p className="max-w-[85%] min-h-9 px-3.5 py-2 bg-indigo-600 text-white text-sm rounded-2xl rounded-br-md">
            {question}
            {typing && <span className="type-caret" />}
          </p>
        </div>

        {phase === "searching" && (
          <p className="flex items-center gap-2 px-1 text-xs animate-[fadeIn_0.3s_ease-out]">
            <Search className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span className="shimmer-text">Reading {BROCHURE}…</span>
          </p>
        )}

        {phase === "answer" && (
          <div className="max-w-[94%] px-3.5 py-3 bg-white border border-slate-200 text-sm text-slate-700 leading-relaxed rounded-2xl rounded-bl-md animate-[popIn_0.3s_ease-out] [&_strong]:text-slate-900">
            <p>{scenario.answer}</p>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 animate-[fadeIn_0.4s_0.25s_ease-out_both]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sources</p>
              <p className="mt-1 flex items-center gap-2 text-xs">
                <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                <span className="font-medium text-slate-700 truncate">{BROCHURE}</span>
                <span className="shrink-0 px-1.5 rounded hit-tag font-semibold tabular-nums">p. {scenario.page}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-slate-200">
        <div className="flex items-center justify-between gap-2 pl-3.5 pr-1.5 py-1.5 border border-slate-300 rounded-xl text-sm text-slate-400">
          Ask a follow-up…
          <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ArrowUp className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

// Printer's crop marks at the corners, a nod to the printed brochure.
function CropMarks() {
  return (
    <div className="crop-marks hidden sm:block" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
