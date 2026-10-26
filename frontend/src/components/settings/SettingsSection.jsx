/** Heading, description and body shared by every settings tab. */

export function SettingsSection({ title, description, danger = false, children }) {
  return (
    <section>
      <h3 className={`text-base font-semibold ${danger ? "text-red-600" : "text-slate-900"}`}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}
