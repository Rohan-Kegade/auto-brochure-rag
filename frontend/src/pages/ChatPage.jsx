import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { DEFAULT_CHAT_TITLE } from "../constants/config";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { useChatDocuments } from "../hooks/useChatDocuments";
import { useTheme } from "../hooks/useTheme";
import { Sidebar } from "../components/sidebar/Sidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { BrochureBar } from "../components/chat/BrochureBar";
import { WelcomeScreen } from "../components/chat/WelcomeScreen";
import { MessageList } from "../components/chat/MessageList";
import { ChatInput } from "../components/chat/ChatInput";
import { SettingsDialog } from "../components/settings/SettingsDialog";

export function ChatPage() {
  const chat = useChat();
  const docs = useChatDocuments(chat.activeChatId);
  const { theme, preference, setPreference } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Below the md breakpoint the sidebar is a drawer over the chat.
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const onChange = (e) => e.matches && setDrawerOpen(false);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const setCollapsed = (value) => {
    setSidebarCollapsed(value);
    try {
      localStorage.setItem("sidebarCollapsed", value ? "1" : "0");
    } catch {
      // Remembering the choice is a convenience; ignore storage failures.
    }
  };
  const showWelcome =
    !chat.isBooting &&
    !chat.isLoadingMessages &&
    !chat.isLoading &&
    chat.messages.length === 0;

  return (
    <div className="flex h-dvh bg-slate-100 text-slate-800">
      <Sidebar
        chats={chat.chats}
        activeChatId={chat.activeChatId}
        onNewChat={() => {
          chat.newChat();
          setDrawerOpen(false);
        }}
        onSelectChat={(id) => {
          chat.selectChat(id);
          setDrawerOpen(false);
        }}
        onRenameChat={chat.renameChat}
        onDeleteChat={chat.deleteChat}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setCollapsed(!sidebarCollapsed)}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
        user={user}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setDrawerOpen(false);
        }}
        onLogout={async () => {
          await logout();
          navigate("/", { replace: true });
        }}
      />

      <main className="flex-1 flex flex-col bg-slate-50 min-w-0">
        <ChatHeader
          title={chat.isBooting ? "Loading…" : (chat.activeChat?.title ?? DEFAULT_CHAT_TITLE)}
          createdAt={chat.activeChat?.created_at}
          onOpenSidebar={() => setDrawerOpen(true)}
        />
        <BrochureBar
          chatId={chat.activeChatId}
          documents={docs.documents}
          isLoadingDocuments={docs.isLoading}
          activePdfCount={docs.activePdfCount}
          maxPdfs={docs.maxPdfs}
          maxPdfsReached={docs.maxPdfsReached}
          isUploading={docs.isUploading}
          onAttach={docs.attach}
          onUpload={docs.upload}
          onDetach={docs.detach}
          onLibraryDelete={docs.forget}
          pickerOpen={pickerOpen}
          onPickerOpenChange={setPickerOpen}
        />
        {chat.isLoadingMessages ? (
          <div className="flex-1" />
        ) : showWelcome ? (
          <WelcomeScreen
            activePdfCount={docs.activePdfCount}
            maxPdfs={docs.maxPdfs}
            maxPdfsReached={docs.maxPdfsReached}
            onAddBrochure={() => setPickerOpen(true)}
            onPickSuggestion={(text) => chat.sendMessage(null, docs.commitDraft, text)}
          />
        ) : (
          <MessageList
            messages={chat.messages}
            // Dots only until the first streamed token arrives.
            isLoading={
              chat.isLoading && chat.messages[chat.messages.length - 1]?.sender !== "ai"
            }
            canRetry={!chat.isLoading && docs.hasActivePdfs}
            onRetry={chat.retryMessage}
          />
        )}
        <ChatInput
          inputQuery={chat.inputQuery}
          hasActivePdfs={docs.hasActivePdfs}
          activePdfCount={docs.activePdfCount}
          isLoadingDocuments={docs.isLoading}
          isLoading={chat.isLoading}
          canStop={chat.canStop}
          onInputChange={chat.setInputQuery}
          onSubmit={(e) => chat.sendMessage(e, docs.commitDraft)}
          onStop={chat.stopResponse}
        />
      </main>

      {settingsOpen && (
        <SettingsDialog
          chats={chat.chats}
          activeChatId={chat.activeChatId}
          onSelectChat={(id) => {
            chat.selectChat(id);
            setSettingsOpen(false);
          }}
          onDeleteChats={chat.deleteChats}
          // A brochure deleted there may be attached to the open chat.
          onDocumentDeleted={docs.forget}
          themePreference={preference}
          onThemePreferenceChange={setPreference}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <Toaster theme={theme} position="top-center" richColors closeButton />
    </div>
  );
}
