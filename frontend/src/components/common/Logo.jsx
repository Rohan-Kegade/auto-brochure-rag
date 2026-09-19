export function Logo({ className = "w-10 h-10" }) {
  return (
    <img
      src="/logo.svg"
      alt="SpecSense logo"
      className={`${className}`}
    />
  );
}
