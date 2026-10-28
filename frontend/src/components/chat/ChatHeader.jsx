import { Menu } from "lucide-react";
import { formatDateTime } from "../../utils/format";

export function ChatHeader({ title, createdAt, onOpenSidebar }) {
  return (
    <header className="h-16 px-4 sm:px-6 flex items-center gap-3 sm:gap-4">
      <button
        onClick={onOpenSidebar}
        title="Open sidebar"
        aria-label="Open sidebar"
        className="md:hidden -ml-1.5 p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h2
          className="font-display text-lg font-semibold tracking-tight text-slate-900 truncate"
          title={title}
        >
          {title}
        </h2>
        {createdAt && (
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 truncate">
            Created {formatDateTime(createdAt)}
          </p>
        )}
      </div>
    </header>
  );
}
