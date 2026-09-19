import { Moon, Sun } from "lucide-react";
import { formatDateTime } from "../../utils/format";

export function ChatHeader({ title, createdAt, theme, onToggleTheme }) {
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between gap-4 shadow-xs">
      <div className="min-w-0 flex flex-col justify-center">
        <h2
          className="text-base font-semibold text-slate-800 truncate"
          title={title}
        >
          {title}
        </h2>
        {createdAt && (
          <p className="text-xs text-slate-400">Created {formatDateTime(createdAt)}</p>
        )}
      </div>
      <button
        onClick={onToggleTheme}
        title={label}
        aria-label={label}
        className="shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
