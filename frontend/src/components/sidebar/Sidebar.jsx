import { useState } from "react";
import { MessageSquare, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { Logo } from "../common/Logo";

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

  const handleDelete = async () => {
    if (await confirmToast(`Delete "${chat.title}"? Its messages will be lost.`)) {
      onDelete(chat.id);
    }
  };

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
        className={`flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 text-left text-sm cursor-pointer ${
          active ? "text-indigo-700 font-medium" : "text-slate-600"
        }`}
      >
        <MessageSquare className="w-4 h-4 shrink-0" />
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
          onClick={handleDelete}
          title="Delete"
          className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
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
}) {
  return (
    <aside className="w-72 border-r border-slate-200 bg-white p-4 flex flex-col shadow-xs">
      <div className="flex items-center gap-2 mb-5 px-2">
        <Logo />
        <h1 className="text-xl font-bold text-slate-900">SpecSense</h1>
      </div>

      <div className="px-2 mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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

      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {chats.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            onSelect={onSelectChat}
            onRename={onRenameChat}
            onDelete={onDeleteChat}
          />
        ))}
      </nav>

      <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4 mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" /> AI Enabled
        </span>
      </div>
    </aside>
  );
}
