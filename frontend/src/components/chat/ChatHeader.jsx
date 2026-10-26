import { ThemeToggle } from "../common/ThemeToggle";
import { formatDateTime } from "../../utils/format";

export function ChatHeader({ title, createdAt, theme, onToggleTheme }) {
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
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
