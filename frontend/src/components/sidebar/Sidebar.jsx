import { useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Search, Plus, Settings, Sparkles, X } from "lucide-react";
import { formatDay } from "../../utils/format";
import { Logo } from "../common/Logo";
import { Wordmark } from "../common/Wordmark";
import { ChatRow } from "./ChatRow";

// Group chats under a day heading, keeping the list's existing order.
function groupByDay(chats) {
  const groups = new Map();
  // Newest first, so the most recent day (and chat) is at the top.
  const newestFirst = [...chats].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  for (const chat of newestFirst) {
    const label = formatDay(chat.created_at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(chat);
  }
  return [...groups].map(([label, items]) => ({ label, items }));
}

export function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  collapsed,
  onToggleCollapsed,
  user,
  onOpenSettings,
  onLogout,
  drawerOpen,
  onCloseDrawer,
}) {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visibleChats = needle
    ? chats.filter((c) => c.title.toLowerCase().includes(needle))
    : chats;

  // The drawer always shows the full sidebar; the icon rail is desktop only.
  const showRail = collapsed && !drawerOpen;

  return (
    <>
    {drawerOpen && (
      <div
        className="fixed inset-0 z-30 bg-slate-900/40 dark:bg-black/60 md:hidden animate-[fadeIn_120ms_ease-out]"
        onClick={onCloseDrawer}
        aria-hidden="true"
      />
    )}
    {/* Below md: an off-canvas drawer. From md up: animates its width between
        the full sidebar and a narrow icon rail. */}
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 md:static md:z-auto md:translate-x-0 shrink-0 overflow-hidden bg-white border-r border-slate-200 shadow-xs transition-[width,translate] duration-200 ease-in-out ${
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      } ${showRail ? "md:w-16" : "md:w-72"}`}
    >
    {showRail ? (
      <div className="w-16 h-full py-4 flex flex-col items-center gap-3">
        <Logo />
        <button
          onClick={onToggleCollapsed}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
          className="p-2 text-slate-600 border border-slate-200 rounded-md hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleCollapsed}
          title="Search chats"
          aria-label="Search chats"
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>
        <Sparkles
          className="w-3.5 h-3.5 text-indigo-500 mt-auto"
          aria-label="AI Enabled"
        />
        <button
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onLogout}
          title={`Log out ${user.email}`}
          aria-label="Log out"
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    ) : (
    <div className="w-72 h-full p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-5 px-2">
        <Logo />
        <h1 className="text-xl font-bold text-slate-900 flex-1"><Wordmark /></h1>
        <button
          onClick={drawerOpen ? onCloseDrawer : onToggleCollapsed}
          title={drawerOpen ? "Close sidebar" : "Collapse sidebar"}
          aria-label={drawerOpen ? "Close sidebar" : "Collapse sidebar"}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          {drawerOpen ? <X className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <div className="px-2 mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Chats
        </span>
        <button
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
          className="p-1.5 text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-2 mb-3 relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Search chats..."
          aria-label="Search chats"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto">
        {groupByDay(visibleChats).map(({ label, items }) => (
          <section key={label} className="mb-3">
            <h3 className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
              {label}
            </h3>
            <div className="space-y-1 pl-1.5">
              {items.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeChatId}
                  onSelect={onSelectChat}
                  onRename={onRenameChat}
                  onDelete={onDeleteChat}
                />
              ))}
            </div>
          </section>
        ))}
        {needle && visibleChats.length === 0 && (
          <p className="px-3 py-4 text-sm text-slate-400 italic">No chats match your search.</p>
        )}
      </nav>

      <div className="border-t border-slate-100 pt-3 mt-2 flex items-center gap-2.5 px-1">
        <span
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold"
          aria-hidden="true"
        >
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate" title={user.name}>
            {user.name}
          </p>
          <p className="text-[11px] text-slate-400 truncate" title={user.email}>
            {user.email}
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
    )}
    </aside>
    </>
  );
}
