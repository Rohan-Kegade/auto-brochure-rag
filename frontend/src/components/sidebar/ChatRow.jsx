import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { ChatRowMenu } from "./ChatRowMenu";

/** One chat in the sidebar list: select, rename (double-click) or delete it. */
export function ChatRow({ chat, active, onSelect, onRename, onDelete }) {
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
