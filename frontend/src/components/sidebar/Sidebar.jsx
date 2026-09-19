import { MessageSquare, Plus, Sparkles } from "lucide-react";
import { Logo } from "../common/Logo";

export function Sidebar({ chats, activeChatId, onNewChat, onSelectChat }) {
  return (
    <aside className="w-72 border-r border-slate-200 bg-white p-4 flex flex-col shadow-xs">
      <div className="flex items-center gap-2 mb-5 px-2">
        <Logo />
        <h1 className="text-xl font-bold text-slate-900">SpecSense</h1>
      </div>

      <button
        onClick={onNewChat}
        className="w-full mb-4 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
      >
        <Plus className="w-4 h-4" />
        New chat
      </button>

      <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Chats
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {chats.map((chat) => {
          const active = chat.id === activeChatId;
          return (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              title={chat.title}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                active
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="truncate">{chat.title}</span>
            </button>
          );
        })}
      </nav>

      <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4 mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" /> AI Enabled
        </span>
      </div>
    </aside>
  );
}
