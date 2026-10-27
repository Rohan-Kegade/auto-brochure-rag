import { useState } from "react";
import { MessageSquare, Search, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { formatDateTime } from "../../utils/format";
import { toggleId } from "../../utils/selection";
import { SelectionBar } from "./SelectionBar";
import { SettingsSection } from "./SettingsSection";

/** Every saved chat: open one, or delete one or several. Uses the sidebar's list, so both stay in sync. */
export function ChatsSection({ chats, activeChatId, onSelectChat, onDeleteChats }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  // The chats waiting on the confirm dialog: one row's, or the selection.
  const [pendingDelete, setPendingDelete] = useState(null);

  const needle = query.trim().toLowerCase();
  const visible = needle ? chats.filter((c) => c.title.toLowerCase().includes(needle)) : chats;
  // Only what's on screen counts, so a search never deletes hidden chats.
  const selectedVisible = visible.filter((c) => selected.has(c.id));

  const toggleAll = () =>
    setSelected(
      selectedVisible.length === visible.length ? new Set() : new Set(visible.map((c) => c.id))
    );

  const remove = async (items) => {
    await onDeleteChats(items.map((c) => c.id));
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((c) => next.delete(c.id));
      return next;
    });
  };

  return (
    <SettingsSection
      title="Chats"
      description="Every chat you've started. Deleting one removes its messages; your brochures stay in the library."
    >
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
          aria-label="Search chats"
          className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <SelectionBar
        total={visible.length}
        selectedCount={selectedVisible.length}
        onToggleAll={toggleAll}
        onDelete={() => setPendingDelete(selectedVisible)}
      />

      <ul className={`${visible.length > 0 ? "mt-1" : "mt-4"} space-y-1.5`}>
        {visible.length === 0 && (
          <li className="text-sm text-slate-400 italic py-6 text-center">
            {query ? "No chats match your search." : "You haven't started any chats yet."}
          </li>
        )}
        {visible.map((chat) => {
          const active = chat.id === activeChatId;
          const checked = selected.has(chat.id);
          return (
            <li
              key={chat.id}
              className={`flex items-center gap-1 pl-3 pr-1 border rounded-lg ${
                checked
                  ? "border-indigo-300 bg-indigo-50"
                  : active
                    ? "border-indigo-200 bg-indigo-50/40"
                    : "border-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => setSelected((prev) => toggleId(prev, chat.id))}
                aria-label={`Select ${chat.title}`}
                className="w-4 h-4 accent-indigo-600 cursor-pointer shrink-0"
              />
              <button
                onClick={() => onSelectChat(chat.id)}
                title="Open chat"
                className="min-w-0 flex-1 flex items-center gap-3 px-2 py-2.5 text-left rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700 truncate" title={chat.title}>
                    {chat.title}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {active ? "Open now · " : ""}Last active {formatDateTime(chat.updated_at)}
                  </div>
                </div>
              </button>
              <button
                onClick={() => setPendingDelete([chat])}
                title="Delete chat"
                aria-label={`Delete ${chat.title}`}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {chats.length > 0 && (
        <div className="mt-3 text-xs text-slate-400">
          Showing {visible.length} of {chats.length}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.length === 1 ? "Delete this chat?" : `Delete ${pendingDelete.length} chats?`}
          detail={pendingDelete.length === 1 ? pendingDelete[0].title : undefined}
          description={`${pendingDelete.length === 1 ? "Its" : "Their"} messages will be permanently deleted. Your uploaded brochures stay in the library.`}
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </SettingsSection>
  );
}
