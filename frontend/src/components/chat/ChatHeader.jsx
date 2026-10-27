import { Menu } from "lucide-react";
import { formatDateTime } from "../../utils/format";

export function ChatHeader({ title, createdAt, onOpenSidebar }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center gap-3 sm:gap-4 shadow-xs">
      <button
        onClick={onOpenSidebar}
        title="Open sidebar"
        aria-label="Open sidebar"
        className="md:hidden -ml-1.5 p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h2
          className="text-base font-semibold text-slate-800 truncate"
          title={title}
        >
          {title}
        </h2>
        {createdAt && (
          <p className="text-xs text-slate-400 truncate">Created {formatDateTime(createdAt)}</p>
        )}
      </div>
    </header>
  );
}
