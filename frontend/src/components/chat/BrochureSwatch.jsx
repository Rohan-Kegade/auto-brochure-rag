import { toneGradient, useBrochureTone } from "../../hooks/useBrochureTone";

// A brochure's colour as a tiny cover with a folded corner.
export function BrochureSwatch({ id, className = "w-3.5 h-4.5" }) {
  const tone = useBrochureTone(id);
  return (
    <span
      className={`brochure-swatch shrink-0 inline-block rounded-[3px] ${className}`}
      style={{ backgroundImage: toneGradient(tone) }}
      aria-hidden="true"
    />
  );
}
