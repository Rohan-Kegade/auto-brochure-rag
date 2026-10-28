import { Check, FileText } from "lucide-react";
import { MAX_PDFS } from "../../constants/config";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const CARS = [
  { name: "Norra Cross", tone: "from-indigo-600 to-violet-600", dot: "bg-indigo-500", pages: "pp. 14, 22", x: "-88px", r: "-9deg" },
  { name: "Halden SX", tone: "from-sky-500 to-indigo-600", dot: "bg-sky-500", pages: "pp. 9, 18", x: "0px", r: "0deg" },
  { name: "Vela Sport", tone: "from-violet-600 to-fuchsia-500", dot: "bg-fuchsia-500", pages: "pp. 6, 11", x: "88px", r: "9deg" },
];

const ROWS = [
  { label: "Airbags, base trim", values: ["6", "2", "6"], best: [0, 2] },
  { label: "Boot space", values: ["433 L", "380 L", "470 L"], best: [2] },
  { label: "Ground clearance", values: ["208 mm", "190 mm", "180 mm"], best: [0] },
  { label: "Warranty", values: ["3 yr", "5 yr", "3 yr"], best: [1] },
];

const TABLE_COLS = "grid grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]";

export function CompareShowcase() {
  return (
    <section id="compare" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <SectionHeading
        number="01"
        label="Compare"
        title={
          <>
            Up to {MAX_PDFS} brochures in.
            <br className="hidden sm:block" /> One straight answer out.
          </>
        }
      >
        Put your whole shortlist in one chat. BrochureIQ lines the cars up spec by
        spec and tells you which brochure, and which page, every number came from.
      </SectionHeading>

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
        <Reveal className="covers relative h-64 sm:h-80" aria-hidden="true">
          {CARS.map((car, i) => (
            <BrochureCover key={car.name} car={car} index={i} />
          ))}
        </Reveal>

        <Reveal delay={120} className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-indigo-900/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap gap-2">
            {CARS.map((car) => (
              <span
                key={car.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[11px]"
              >
                <FileText className="w-3 h-3" />
                {car.name}.pdf
              </span>
            ))}
          </div>

          <div className="p-4 sm:p-5 space-y-4 bg-slate-50">
            <div className="flex justify-end">
              <p className="max-w-[85%] px-3.5 py-2 bg-indigo-600 text-white text-sm rounded-2xl rounded-br-md">
                Compare these on safety, boot space and warranty.
              </p>
            </div>

            <div className="px-3.5 sm:px-4 py-4 bg-white border border-slate-200 rounded-2xl rounded-bl-md text-sm text-slate-700">
              <div className="text-xs">
                <div className={TABLE_COLS}>
                  <span />
                  {CARS.map((car) => (
                    <span key={car.name} className="flex items-center gap-1.5 px-1.5 pb-2 font-semibold text-slate-900 min-w-0">
                      <span className={`w-2 h-2 shrink-0 rounded-full ${car.dot}`} />
                      <span className="truncate">{car.name}</span>
                    </span>
                  ))}
                </div>

                {ROWS.map((row, i) => (
                  <div key={row.label} className={`stagger-item ${TABLE_COLS}`} style={{ "--i": i }}>
                    <span className="py-2 pr-2 border-t border-slate-100 text-slate-500">{row.label}</span>
                    {row.values.map((value, j) => {
                      const best = row.best.includes(j);
                      return (
                        <span key={j} className="py-1 border-t border-slate-100">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded tabular-nums ${
                              best ? "best-cell font-semibold" : "text-slate-600"
                            }`}
                          >
                            {value}
                            {best && <Check className="w-3 h-3" />}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>

              <p className="mt-3 leading-relaxed [&_strong]:text-slate-900">
                <strong>Vela Sport</strong> has the biggest boot and <strong>Halden SX</strong> the
                longest warranty, but the Halden only gets 2 airbags on its base trim.
              </p>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sources</p>
                <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  {CARS.map((car) => (
                    <li key={car.name} className="flex items-center gap-1.5 text-xs">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-medium text-slate-700">{car.name}</span>
                      <span className="text-slate-500">{car.pages}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// A brochure front cover; the three fan out wider on hover.
function BrochureCover({ car, index }) {
  return (
    <div
      className="cover absolute left-1/2 top-1/2 w-36 sm:w-48 aspect-[3/4] bg-white border border-slate-200 rounded-xl shadow-xl shadow-indigo-900/10 overflow-hidden"
      style={{ "--x": car.x, "--r": car.r, zIndex: index === 1 ? 2 : 1 }}
    >
      <div className={`relative h-[62%] bg-linear-to-br ${car.tone} px-3 pt-3 text-white`}>
        <p className="text-[9px] uppercase tracking-[0.25em] opacity-80">Model year 2026</p>
        <p className="mt-1 font-display text-base sm:text-lg font-bold leading-tight">{car.name}</p>
        <CarSilhouette className="absolute left-2 right-2 bottom-2 sm:bottom-3 text-white" />
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">Official brochure</p>
        <div className="h-1 w-10/12 rounded-full bg-slate-100" />
        <div className="h-1 w-8/12 rounded-full bg-slate-100" />
        <div className="h-1 w-9/12 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

function CarSilhouette({ className = "" }) {
  return (
    <svg viewBox="0 0 122 46" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillOpacity="0.95"
        d="M6 33c0-3.5 2.2-5.5 6-6.2L30 23.5l13.5-10.6c2-1.6 4.4-2.4 7-2.4H78c3.4 0 6.3 1.3 8.7 3.6l9.8 9.4 13.4 2.6c3.8.7 6.1 3.3 6.1 7v3.7c0 1.4-1 2.2-2.4 2.2h-9.3a10 10 0 0 0-19.6 0H37.9a10 10 0 0 0-19.6 0H8.2C6.9 39 6 38.1 6 36.8z"
      />
      <path fill="#000" fillOpacity="0.25" d="M47.5 14.5h17.5v9H37zM68.5 14.5H78c2.3 0 4.3.9 6 2.5l6.4 6.5H68.5z" />
      <circle cx="28" cy="38" r="7.2" />
      <circle cx="28" cy="38" r="3.2" fill="#000" fillOpacity="0.3" />
      <circle cx="96" cy="38" r="7.2" />
      <circle cx="96" cy="38" r="3.2" fill="#000" fillOpacity="0.3" />
    </svg>
  );
}
