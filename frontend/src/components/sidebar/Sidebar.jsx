import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical, LogOut, Pencil, PanelLeftClose, PanelLeftOpen, Search, Plus, Settings, Sparkles, Trash2, X } from "lucide-react";
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

const MENU_WIDTH = 144;
const MENU_HEIGHT = 84;

// Touch screens have no hover, so a chat's actions live behind a ⋮ menu there.
// Portalled with fixed positioning so the scrolling chat list (and the drawer's
// transform) can't clip it.
function ChatRowMenu({ onRename, onDelete }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  const toggle = () => {
    if (position) return setPosition(null);
    const rect = buttonRef.current.getBoundingClientRect();
    // Open upwards when there isn't room below.
    const top =
      rect.bottom + MENU_HEIGHT > window.innerHeight ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4;
    setPosition({ top, left: Math.max(8, rect.right - MENU_WIDTH) });
  };

  useEffect(() => {
    if (!position) return;
    const close = (e) => {
      if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setPosition(null);
    };
    const onKey = (e) => e.key === "Escape" && setPosition(null);
    const onScroll = () => setPosition(null);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    // Capture phase, so scrolling the chat list closes it too.
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [position]);

  const choose = (action) => () => {
    setPosition(null);
    action();
  };

  const itemClass =
    "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-slate-50 cursor-pointer";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        title="Chat options"
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        className="hidden pointer-coarse:block p-2 mr-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
      >
        <EllipsisVertical className="w-4 h-4" />
      </button>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="fixed z-50 py-1 bg-white border border-slate-200 rounded-xl shadow-lg animate-[popIn_120ms_ease-out]"
          >
            <button role="menuitem" onClick={choose(onRename)} className={`${itemClass} text-slate-700`}>
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              Rename
            </button>
            <button role="menuitem" onClick={choose(onDelete)} className={`${itemClass} text-red-600`}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
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
      <div className="hidden pointer-fine:group-hover:flex pointer-fine:focus-within:flex items-center pr-1 shrink-0">
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
      <ChatRowMenu onRename={startEditing} onDelete={() => setConfirmOpen(true)} />
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
        <h1 className="text-xl font-bold text-slate-900 flex-1">SpecSense</h1>
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
