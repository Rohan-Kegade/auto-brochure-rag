import { Toaster } from "sonner";
import { DEFAULT_CHAT_TITLE } from "./constants/config";
import { useChat } from "./hooks/useChat";
import { useChatDocuments } from "./hooks/useChatDocuments";
import { Sidebar } from "./components/sidebar/Sidebar";
import { ChatHeader } from "./components/chat/ChatHeader";
import { BrochureBar } from "./components/chat/BrochureBar";
import { MessageList } from "./components/chat/MessageList";
import { ChatInput } from "./components/chat/ChatInput";

export default function App() {
  const chat = useChat();
  const docs = useChatDocuments(chat.activeChatId);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      <Sidebar
        chats={chat.chats}
        activeChatId={chat.activeChatId}
        onNewChat={chat.newChat}
        onSelectChat={chat.selectChat}
        onRenameChat={chat.renameChat}
        onDeleteChat={chat.deleteChat}
      />

      <main className="flex-1 flex flex-col bg-slate-50 min-w-0">
        <ChatHeader
          title={chat.isBooting ? "Loading…" : (chat.activeChat?.title ?? DEFAULT_CHAT_TITLE)}
        />
        <BrochureBar
          chatId={chat.activeChatId}
          documents={docs.documents}
          activePdfCount={docs.activePdfCount}
          maxPdfs={docs.maxPdfs}
          maxPdfsReached={docs.maxPdfsReached}
          isUploading={docs.isUploading}
          onAttach={docs.attach}
          onUpload={docs.upload}
          onDetach={docs.detach}
          onLibraryDelete={docs.forget}
        />
        <MessageList messages={chat.messages} isLoading={chat.isLoading} />
        <ChatInput
          inputQuery={chat.inputQuery}
          hasActivePdfs={docs.hasActivePdfs}
          activePdfCount={docs.activePdfCount}
          isLoading={chat.isLoading}
          onInputChange={chat.setInputQuery}
          onSubmit={(e) => chat.sendMessage(e, docs.commitDraft)}
        />
      </main>

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
