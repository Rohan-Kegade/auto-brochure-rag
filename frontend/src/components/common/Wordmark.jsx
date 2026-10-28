// Brand name: "Brochure" in the text colour, "IQ" in the brand gradient.
export function Wordmark({ className = "" }) {
  return (
    <span className={`wordmark tracking-tight ${className}`}>
      Brochure<span className="wordmark-iq">IQ</span>
    </span>
  );
}
