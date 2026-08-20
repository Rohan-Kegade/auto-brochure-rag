import React, { useState } from "react";
import { getOrCreateSessionId, createNewSessionId } from "./utils/session";
import { useFileManager } from "./hooks/useFileManager";
import { useChat } from "./hooks/useChat";

import { Sidebar } from "./components/sidebar/Sidebar";
import { ChatHeader } from "./components/chat/ChatHeader";
import { MessageList } from "./components/chat/MessageList";
import { ChatInput } from "./components/chat/ChatInput";
import { ConfirmModal } from "./components/common/ConfirmModal";

export default function App() {
  const [sessionId, setSessionId] = useState(getOrCreateSessionId);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  const {
    messages,
    inputQuery,
    isLoading,
    setInputQuery,
    sendMessage,
    addSystemNotice,
    resetChat,
  } = useChat(sessionId, false);

  const fileManager = useFileManager(sessionId, (newlyUploadedFiles) => {
    const noticeText =
      newlyUploadedFiles.length === 1
        ? `**${newlyUploadedFiles[0].name}** is ready. Ask me anything about it.`
        : `Your ${newlyUploadedFiles.length} brochures are ready. You can now ask questions or compare them.`;
    addSystemNotice(noticeText);
  });

  const handleConfirmNewSession = () => {
    const newId = createNewSessionId();
    setSessionId(newId);
    fileManager.resetFiles();
    resetChat();
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      <Sidebar
        selectedFiles={fileManager.selectedFiles}
        uploadedFiles={fileManager.uploadedFiles}
        isUploading={fileManager.isUploading}
        activePdfCount={fileManager.activePdfCount}
        hasActivePdfs={fileManager.hasActivePdfs}
        maxPdfsReached={fileManager.maxPdfsReached}
        onFileChange={fileManager.handleFileChange}
        onUpload={fileManager.uploadDocuments}
        onRemoveFile={fileManager.removeFile}
      />

      <main className="flex-1 flex flex-col bg-slate-50">
        <ChatHeader onOpenRestartModal={() => setShowNewSessionModal(true)} />
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

      <ConfirmModal
        isOpen={showNewSessionModal}
        onClose={() => setShowNewSessionModal(false)}
        onConfirm={handleConfirmNewSession}
        title="Start New Session?"
        message="This will clear your active brochures and chat history. Are you sure you want to proceed?"
      />
    </div>
  );
}
