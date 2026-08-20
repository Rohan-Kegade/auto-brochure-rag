import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  RotateCcw,
  FileText,
  Upload,
  Send,
  X,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";
const MAX_PDFS = 5;

// Helper to manage persistent session_id
const getOrCreateSessionId = () => {
  let id = localStorage.getItem("session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("session_id", id);
  }
  return id;
};

// --- CONFIRMATION MODAL COMPONENT ---
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
          <RotateCcw className="w-5 h-5" />
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>

        <p className="text-xs leading-relaxed text-slate-500 mb-6">{message}</p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [sessionId, setSessionId] = useState(getOrCreateSessionId);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! Add one or more car brochures to get started.",
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const activePdfCount = uploadedFiles.length;
  const hasActivePdfs = activePdfCount > 0;
  const maxPdfsReached = activePdfCount >= MAX_PDFS;

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  // Sync active files from server on component mount or session change
  useEffect(() => {
    const fetchActiveFiles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/files`, {
          headers: { "X-Session-ID": sessionId },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.indexed_files) {
            setUploadedFiles(data.indexed_files.map((name) => ({ name })));
          }
        }
      } catch (err) {
        console.error("Failed to sync active session files:", err);
      }
    };

    fetchActiveFiles();
  }, [sessionId]);

  // Confirm and start a new session
  const handleConfirmNewSession = () => {
    const newId = crypto.randomUUID();
    localStorage.setItem("session_id", newId);
    setSessionId(newId);
    setUploadedFiles([]);
    setSelectedFiles([]);
    setMessages([
      {
        sender: "ai",
        text: "Hello! Add one or more car brochures to get started.",
      },
    ]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validPdfs = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    );

    if (validPdfs.length !== files.length) {
      alert("Only PDF files are supported.");
    }

    const existingNames = new Set(uploadedFiles.map((file) => file.name));
    const newFiles = validPdfs.filter((file) => !existingNames.has(file.name));

    if (!newFiles.length) {
      alert("The selected PDF is already active.");
      e.target.value = "";
      return;
    }

    const availableSlots = MAX_PDFS - activePdfCount;

    if (newFiles.length > availableSlots) {
      alert(
        `You can have up to ${MAX_PDFS} active PDFs. You can add ${availableSlots} more.`,
      );
      setSelectedFiles(newFiles.slice(0, availableSlots));
    } else {
      setSelectedFiles(newFiles);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFiles.length) return;

    const availableSlots = MAX_PDFS - activePdfCount;
    if (selectedFiles.length > availableSlots) {
      alert(`You can have up to ${MAX_PDFS} active PDFs.`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          "X-Session-ID": sessionId,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to add the brochures.");
      }

      const uploadedNames =
        data.uploaded || selectedFiles.map((file) => file.name);

      const newlyUploadedFiles = selectedFiles.filter((file) =>
        uploadedNames.includes(file.name),
      );

      setUploadedFiles((prev) => [...prev, ...newlyUploadedFiles]);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            newlyUploadedFiles.length === 1
              ? `**${newlyUploadedFiles[0].name}** is ready. Ask me anything about it.`
              : `Your ${newlyUploadedFiles.length} brochures are ready. You can now ask questions or compare them.`,
        },
      ]);

      setSelectedFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (fileName) => {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputQuery.trim() || isLoading) return;

    if (!hasActivePdfs) {
      alert("Add at least one brochure first.");
      return;
    }

    const userMessage = inputQuery.trim();

    const historyPayload = messages.map((m) => ({
      role: m.sender,
      content: m.text,
    }));

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userMessage,
      },
    ]);

    setInputQuery("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({
          message: userMessage,
          history: historyPayload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to get a response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.answer,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `**Error:** ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      {/* SIDEBAR */}
      <aside className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs">
        <div>
          {/* Logo & New Session Trigger */}
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">AutoAdvisor</h1>
            </div>

            <button
              onClick={() => setShowNewSessionModal(true)}
              title="Start New Session"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Car Brochures
              </label>

              <span className="text-xs text-slate-400">
                {activePdfCount}/{MAX_PDFS}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              disabled={maxPdfsReached || isUploading}
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1 disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {!maxPdfsReached && (
              <p className="mt-2 text-[11px] text-slate-400">
                Add up to {MAX_PDFS} brochures
              </p>
            )}

            {maxPdfsReached && (
              <p className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Maximum of {MAX_PDFS} brochures reached
              </p>
            )}

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {selectedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 px-2.5 py-2 bg-indigo-50 border border-indigo-100 rounded-lg"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span
                      className="text-xs text-indigo-800 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add Button */}
            {selectedFiles.length > 0 && (
              <button
                onClick={handleUploadDocument}
                disabled={isUploading}
                className="w-full mt-3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Add Brochures
                  </>
                )}
              </button>
            )}
          </div>

          {/* Active Status Badge */}
          <div
            className={`mt-6 p-3 rounded-lg flex items-center gap-3 border ${
              hasActivePdfs
                ? "bg-emerald-50 border-emerald-100"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasActivePdfs ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
              }`}
            ></span>

            <span className="text-xs font-medium text-slate-600">
              {hasActivePdfs
                ? `${activePdfCount} PDF${activePdfCount > 1 ? "s" : ""} Active`
                : "No PDFs Added"}
            </span>
          </div>

          {/* Active PDFs List */}
          {hasActivePdfs && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active PDFs
                </span>

                <span className="text-[11px] text-slate-400">
                  {activePdfCount}/{MAX_PDFS}
                </span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="group flex items-center gap-2.5 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <div className="w-6 h-6 shrink-0 flex items-center justify-center bg-red-50 text-red-500 rounded-md">
                      <FileText className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-medium text-slate-700 truncate"
                        title={file.name}
                      >
                        {file.name}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveFile(file.name)}
                      className="w-5 h-5 shrink-0 flex items-center justify-center text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" /> AI Enabled
          </span>
          <span
            className="font-mono text-[10px] truncate max-w-[100px]"
            title={sessionId}
          >
            ID: {sessionId.slice(0, 8)}...
          </span>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col bg-slate-50">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shadow-xs">
          <h2 className="text-base font-semibold text-slate-800">
            Chat Assistant
          </h2>

          {hasActivePdfs && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              <span className="text-xs text-slate-500">
                {activePdfCount} PDF{activePdfCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-4xl px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-none overflow-hidden"
                }`}
              >
                {msg.sender === "ai" ? (
                  <div className="prose prose-slate prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 border border-slate-200 rounded-lg shadow-xs">
                            <table
                              className="min-w-full divide-y divide-slate-200 text-xs text-left m-0"
                              {...props}
                            />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead
                            className="bg-slate-100 font-semibold text-slate-700"
                            {...props}
                          />
                        ),
                        th: ({ node, ...props }) => (
                          <th
                            className="px-3 py-2 border-b border-slate-200 font-semibold text-slate-900 whitespace-nowrap"
                            {...props}
                          />
                        ),
                        td: ({ node, ...props }) => (
                          <td
                            className="px-3 py-2 border-b border-slate-100 border-r last:border-r-0 whitespace-nowrap bg-white"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none text-slate-400 text-sm flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto flex gap-3"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                hasActivePdfs
                  ? activePdfCount === 1
                    ? "Ask anything about this brochure..."
                    : "Ask about features, specs or compare these brochures..."
                  : "Add a brochure to start chatting..."
              }
              disabled={!hasActivePdfs || isLoading}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={!hasActivePdfs || isLoading || !inputQuery.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* NEW SESSION CONFIRMATION MODAL */}
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
