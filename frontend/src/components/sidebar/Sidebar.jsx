import { useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Search, Plus, Settings, X } from "lucide-react";
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

const ICON_BUTTON =
  "p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors cursor-pointer";

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
  const initial = user.name.trim().charAt(0).toUpperCase();

  return (
    <>
    {drawerOpen && (
      <div
        className="fixed inset-0 z-30 bg-slate-900/40 dark:bg-black/60 md:hidden animate-[fadeIn_120ms_ease-out]"
        onClick={onCloseDrawer}
        aria-hidden="true"
      />
    )}
    {/* Below md: an off-canvas drawer. From md up: sits on the canvas beside
        the chat sheet and animates its width between full and an icon rail. */}
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 md:static md:z-auto md:translate-x-0 shrink-0 overflow-hidden bg-slate-100 shadow-2xl md:shadow-none transition-[width,translate] duration-200 ease-in-out ${
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      } ${showRail ? "md:w-16" : "md:w-72"}`}
    >
    {showRail ? (
      <div className="w-16 h-full py-4 flex flex-col items-center gap-2">
        <Logo className="w-9 h-9 mb-2" />
        <button
          onClick={onToggleCollapsed}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className={ICON_BUTTON}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
          className="p-2 bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-600/20 hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleCollapsed}
          title="Search chats"
          aria-label="Search chats"
          className={ICON_BUTTON}
        >
          <Search className="w-4 h-4" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-1">
          <button onClick={onOpenSettings} title="Settings" aria-label="Settings" className={ICON_BUTTON}>
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            title={`Log out ${user.email}`}
            aria-label="Log out"
            className={`${ICON_BUTTON} hover:text-red-500!`}
          >
            <LogOut className="w-4 h-4" />
          </button>
          <span className="avatar mt-2 w-8 h-8" title={user.name} aria-hidden="true">
            {initial}
          </span>
        </div>
      </div>
    ) : (
    <div className="w-72 h-full px-3 py-4 flex flex-col">
      <div className="flex items-center gap-2 px-2">
        <Logo className="w-9 h-9" />
        <h1 className="text-xl font-bold text-slate-900 flex-1"><Wordmark /></h1>
        <button
          onClick={drawerOpen ? onCloseDrawer : onToggleCollapsed}
          title={drawerOpen ? "Close sidebar" : "Collapse sidebar"}
          aria-label={drawerOpen ? "Close sidebar" : "Collapse sidebar"}
          className={`${ICON_BUTTON} p-1.5!`}
        >
          {drawerOpen ? <X className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <button
        onClick={onNewChat}
        className="group mt-5 mx-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors cursor-pointer"
      >
        <span className="w-5 h-5 flex items-center justify-center rounded-md bg-[rgb(255_255_255/0.18)] transition-transform group-hover:rotate-90">
          <Plus className="w-3.5 h-3.5" />
        </span>
        New chat
      </button>

      <div className="mt-3 mx-1 relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Search chats..."
          aria-label="Search chats"
          className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <nav className="mt-5 flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {groupByDay(visibleChats).map(({ label, items }) => (
          <section key={label} className="mb-4">
            <h3 className="flex items-center gap-2 px-2 pb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
              <span>{label}</span>
              <span className="flex-1 h-px bg-slate-200" />
              <span className="tabular-nums">{items.length}</span>
            </h3>
            <div className="space-y-0.5">
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

      <div className="mt-2 p-2 flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl">
        <span className="avatar w-8 h-8" aria-hidden="true">
          {initial}
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
          className={`${ICON_BUTTON} p-1.5! hover:bg-slate-50!`}
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
          className={`${ICON_BUTTON} p-1.5! hover:bg-slate-50! hover:text-red-500!`}
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
