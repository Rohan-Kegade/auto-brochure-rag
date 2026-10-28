import { Reveal } from "./Reveal";

// Section title styled like a brochure chapter marker: "§ 01 — Compare".
export function SectionHeading({ number, label, title, children, className = "" }) {
  return (
    <Reveal className={className}>
      <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-indigo-600">
        <span>§ {number}</span>
        <span className="h-px w-8 bg-indigo-300" />
        <span className="text-slate-500">{label}</span>
      </p>
      <h2 className="mt-4 font-display text-3xl sm:text-[2.6rem] font-bold tracking-[-0.03em] leading-[1.08] text-slate-900">
        {title}
      </h2>
      {children && <p className="mt-4 text-base text-slate-500 leading-relaxed max-w-xl">{children}</p>}
    </Reveal>
  );
}
