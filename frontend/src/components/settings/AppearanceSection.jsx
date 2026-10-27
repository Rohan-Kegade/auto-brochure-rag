import { Monitor, Moon, Sun } from "lucide-react";
import { SettingsSection } from "./SettingsSection";

const OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function AppearanceSection({ preference, onChange }) {
  return (
    <SettingsSection
      title="Appearance"
      description="Choose a theme. System follows your device's light or dark setting."
    >
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 sm:gap-3">
        {OPTIONS.map(({ id, label, icon: Icon }) => {
          const selected = id === preference;
          return (
            <button
              key={id}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${
                selected
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
