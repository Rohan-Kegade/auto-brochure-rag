import { useState } from "react";
import { Pencil, PanelLeftClose, PanelLeftOpen, Search, Plus, Sparkles, Trash2 } from "lucide-react";
import { formatDay } from "../../utils/format";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Logo } from "../common/Logo";

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

function ChatRow({ chat, active, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEditing = () => {
    setDraft(chat.title);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== chat.title) onRename(chat.id, draft);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={255}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full px-3 py-2 rounded-lg text-sm border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  }

  return (
    <div
      className={`group flex items-center rounded-lg transition-colors ${
        active ? "bg-indigo-50" : "hover:bg-slate-50"
      }`}
    >
      <button
        onClick={() => onSelect(chat.id)}
        onDoubleClick={startEditing}
        title={chat.title}
        className={`flex-1 min-w-0 flex items-center px-3 py-2 text-left text-sm cursor-pointer ${
          active ? "text-indigo-700 font-medium" : "text-slate-700"
        }`}
      >
        <span className="truncate">{chat.title}</span>
      </button>
      <div className="hidden group-hover:flex focus-within:flex items-center pr-1 shrink-0">
        <button
          onClick={startEditing}
          title="Rename"
          className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          title="Delete"
          className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {confirmOpen && (
        <ConfirmDialog
          title="Delete this chat?"
          detail={chat.title}
          description="Its messages will be permanently deleted. Your uploaded brochures stay in the library."
          onConfirm={() => onDelete(chat.id)}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
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
}) {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visibleChats = needle
    ? chats.filter((c) => c.title.toLowerCase().includes(needle))
    : chats;

  return (
    // The aside animates its width between the full sidebar and a narrow icon rail.
    <aside
      className={`shrink-0 overflow-hidden bg-white border-r border-slate-200 shadow-xs transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-72"
      }`}
    >
    {collapsed ? (
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
      </div>
    ) : (
    <div className="w-72 h-full p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-5 px-2">
        <Logo />
        <h1 className="text-xl font-bold text-slate-900 flex-1">SpecSense</h1>
        <button
          onClick={onToggleCollapsed}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <PanelLeftClose className="w-4 h-4" />
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
          className="flex items-center gap-1 pl-1.5 pr-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New
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

      <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4 mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" /> AI Enabled
        </span>
      </div>
    </div>
    )}
    </aside>
  );
}
