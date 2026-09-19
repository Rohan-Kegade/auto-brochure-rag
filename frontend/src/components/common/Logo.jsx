export function Logo({ className = "w-10 h-10" }) {
  return (
    <img
      src="/favicon.svg"
      alt="SpecSense logo"
      className={`${className} rounded-xl shadow-xs`}
    />
  );
}
