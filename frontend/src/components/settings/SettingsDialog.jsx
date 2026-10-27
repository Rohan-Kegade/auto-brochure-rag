import { useEffect, useState } from "react";
import { KeyRound, Library, MessagesSquare, UserRound, UserX, X } from "lucide-react";
import { BrochuresSection } from "./BrochuresSection";
import { ChatsSection } from "./ChatsSection";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { PasswordSection } from "./PasswordSection";
import { ProfileSection } from "./ProfileSection";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "password", label: "Password", icon: KeyRound },
  { id: "brochures", label: "My brochures", icon: Library },
  { id: "chats", label: "Chats", icon: MessagesSquare },
  { id: "delete-account", label: "Delete account", icon: UserX, danger: true },
];

export function SettingsDialog({
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChats,
  onDocumentDeleted,
  onClose,
}) {
  const [active, setActive] = useState("profile");

  useEffect(() => {
    // A ConfirmDialog on top handles (and stops) its own Escape first.
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 flex items-center justify-center p-2 sm:p-4 animate-[fadeIn_120ms_ease-out]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[38rem] max-h-full flex flex-col overflow-hidden animate-[popIn_160ms_ease-out]"
      >
        <div className="h-14 shrink-0 px-4 sm:px-5 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Settings</h2>
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close settings"
            className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Icons only on phones, so the open section keeps most of the width. */}
          <nav
            aria-label="Settings sections"
            className="shrink-0 w-14 sm:w-48 p-2 sm:p-3 border-r border-slate-200 bg-slate-50 flex flex-col gap-1"
          >
            {SECTIONS.map(({ id, label, icon: Icon, danger }) => {
              const selected = id === active;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  title={label}
                  aria-label={label}
                  aria-current={selected ? "page" : undefined}
                  className={`flex items-center justify-center sm:justify-start gap-2.5 p-2.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors ${
                    selected
                      ? danger
                        ? "bg-red-50 text-red-600"
                        : "bg-white text-indigo-700 shadow-xs"
                      : danger
                        ? "text-red-500 hover:bg-red-50"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline truncate">{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
            {active === "profile" && <ProfileSection />}
            {active === "password" && <PasswordSection />}
            {active === "brochures" && <BrochuresSection onDocumentDeleted={onDocumentDeleted} />}
            {active === "chats" && (
              <ChatsSection
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={onSelectChat}
                onDeleteChats={onDeleteChats}
              />
            )}
            {active === "delete-account" && <DeleteAccountSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
