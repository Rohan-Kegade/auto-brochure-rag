import { useEffect, useRef } from "react";
import { useFileManager } from "./hooks/useFileManager";
import { useChat } from "./hooks/useChat";
import { Toaster } from "sonner";
import { Sidebar } from "./components/sidebar/Sidebar";
import { ChatHeader } from "./components/chat/ChatHeader";
import { BrochureBar } from "./components/chat/BrochureBar";
import { MessageList } from "./components/chat/MessageList";
import { ChatInput } from "./components/chat/ChatInput";

export default function App() {
  const addSystemNoticeRef = useRef(null);

  const fileManager = useFileManager(
    (newlyUploadedFiles) => {
      const noticeText =
        newlyUploadedFiles.length === 1
          ? `**${newlyUploadedFiles[0].name}** is ready. Ask me anything about it.`
          : `Your ${newlyUploadedFiles.length} brochures are ready. You can now ask questions or compare them.`;
      addSystemNoticeRef.current?.(noticeText);
    },
    (removedFileName) => {
      addSystemNoticeRef.current?.(
        `**${removedFileName}** was removed.`,
      );
    },
  );

  const {
    chats,
    activeChat,
    messages,
    newChat,
    selectChat,
    inputQuery,
    isLoading,
    setInputQuery,
    sendMessage,
    addSystemNotice,
  } = useChat(fileManager.hasActivePdfs);

  useEffect(() => {
    addSystemNoticeRef.current = addSystemNotice;
  }, [addSystemNotice]);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      <Sidebar
        chats={chats}
        activeChatId={activeChat.id}
        onNewChat={newChat}
        onSelectChat={selectChat}
      />

      <main className="flex-1 flex flex-col bg-slate-50 min-w-0">
        <ChatHeader title={activeChat.title} />
        <BrochureBar
          selectedFiles={fileManager.selectedFiles}
          uploadedFiles={fileManager.uploadedFiles}
          isUploading={fileManager.isUploading}
          activePdfCount={fileManager.activePdfCount}
          maxPdfsReached={fileManager.maxPdfsReached}
          maxPdfs={fileManager.maxPdfs}
          onFileChange={fileManager.handleFileChange}
          onUpload={fileManager.uploadDocuments}
          onRemoveFile={fileManager.removeFile}
        />
        <MessageList messages={messages} isLoading={isLoading} />
        <ChatInput
          inputQuery={inputQuery}
          hasActivePdfs={fileManager.hasActivePdfs}
          activePdfCount={fileManager.activePdfCount}
          isLoading={isLoading}
          onInputChange={setInputQuery}
          onSubmit={sendMessage}
        />
      </main>

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
