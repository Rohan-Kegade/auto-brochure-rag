import { MessageSquareText, ScanText, Upload } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const STEPS = [
  {
    icon: Upload,
    title: "Add the brochures",
    text: "Drop in the official PDFs for the cars you're weighing up, or pick ones you've uploaded before.",
  },
  {
    icon: ScanText,
    title: "BrochureIQ reads every page",
    text: "Spec tables, variant lists and the fine print are indexed as soon as they upload.",
  },
  {
    icon: MessageSquareText,
    title: "Ask, then check",
    text: "Ask anything, follow up as much as you like, and check the cited pages whenever you want.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <SectionHeading number="03" label="How it works" title="From PDF to answer in three steps." />

      <ol className="relative mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {/* the dashed track joining the steps */}
        <span
          className="hidden sm:block absolute top-7 left-[calc(16.66%+1.75rem)] right-[calc(16.66%+1.75rem)] border-t-2 border-dashed border-indigo-200"
          aria-hidden="true"
        />
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <Reveal as="li" key={title} delay={i * 120} className="relative sm:text-center">
            <div className="relative inline-flex w-14 h-14 items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-lg shadow-indigo-900/5 text-indigo-600">
              <Icon className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold tabular-nums">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed sm:max-w-xs sm:mx-auto">{text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
