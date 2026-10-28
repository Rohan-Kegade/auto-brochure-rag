import { MAX_FILE_SIZE_MB, MAX_PDFS } from "../../constants/config";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const SPECS = [
  { label: "Input", value: "Official PDF brochures", note: `Up to ${MAX_FILE_SIZE_MB} MB each, straight from the manufacturer.` },
  { label: "Capacity", value: `${MAX_PDFS} brochures per chat`, note: "One car to explore, or the whole shortlist to compare." },
  { label: "Interface", value: "Plain-language chat", note: "Follow-up questions keep the context of the conversation." },
  { label: "Grounding", value: "Your brochures only", note: "Answers come from the PDFs you add, not from guesswork." },
  { label: "Citations", value: "Brochure + page", note: "Listed under every answer, so you can check it yourself." },
  { label: "Library", value: "Upload once, reuse", note: "Attach brochures you've already added to any new chat." },
  { label: "Controls", value: "Retry & stop", note: "Regenerate any answer, or stop one while it's streaming." },
  { label: "Finish", value: "Light & dark", note: "Follows your system theme, or pick one yourself." },
];

// The feature list, laid out like the spec table at the back of a brochure.
export function SpecSheet() {
  return (
    <section id="specs" className="scroll-mt-20 border-y border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading number="02" label="Specifications" title="Built like the brochures it reads.">
            Everything that comes standard, in the format you've been squinting at
            for weeks.
          </SectionHeading>
          <Reveal delay={150} className="mt-10 hidden lg:block">
            <p className="font-display text-[7rem] font-bold leading-none tracking-[-0.06em] spec-count">
              0{SPECS.length}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">Standard on every account</p>
          </Reveal>
        </div>

        <Reveal className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4 bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 text-white text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em]">
            <span>BrochureIQ · Standard equipment</span>
            <span className="opacity-80 shrink-0">All accounts</span>
          </div>
          <dl className="divide-y divide-slate-200">
            {SPECS.map(({ label, value, note }, i) => (
              <div
                key={label}
                className="stagger-item spec-line grid grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)] gap-x-4 px-4 sm:px-6 py-4"
                style={{ "--i": i }}
              >
                <dt className="pt-1 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</dt>
                <dd>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-900">{value}</span>
                    <span className="hidden sm:block flex-1 border-b border-dotted border-slate-300" />
                    <span className="hidden sm:block text-[11px] text-slate-400 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">{note}</p>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
