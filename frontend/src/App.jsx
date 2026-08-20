import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! Upload a brochure pdf to start asking questions.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatEndRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Auto-scroll chat window when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle Document Uploading
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a PDF file first.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setIsIndexed(true);
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `Successfully indexed document: **${selectedFile.name}**. You can now ask questions!`,
          },
        ]);
      } else {
        alert(`Error: ${data.detail || "Failed to upload document"}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Chat Question
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;

    if (!isIndexed) {
      alert("Please upload a brochure document first before asking questions.");
      return;
    }

    const userMessage = inputQuery;
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/chat?query=${encodeURIComponent(userMessage)}`,
      );
      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [...prev, { sender: "ai", text: data.answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `Error: ${data.detail || "Failed to fetch response."}`,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: `Network error: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      {/* ---------------- LEFT SIDEBAR ---------------- */}
      <aside className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-600 rounded-lg text-white font-bold text-lg">
              📄
            </div>
            <h1 className="text-xl font-bold text-slate-900">AutoAdvisor</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Upload Brochure (PDF)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1"
              />
            </div>

            <button
              onClick={handleUploadDocument}
              disabled={isUploading || !selectedFile}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Indexing PDF...
                </>
              ) : (
                "Upload PDF"
              )}
            </button>
          </div>

          {/* Status Badge */}
          <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                isIndexed ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            ></span>
            <span className="text-xs font-medium text-slate-600">
              {isIndexed ? "FAISS Index Active" : "No Document Indexed"}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
          AI Enabled
        </div>
      </aside>

      {/* ---------------- MAIN CHAT WINDOW ---------------- */}
      <main className="flex-1 flex flex-col bg-slate-50">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shadow-xs">
          <h2 className="text-base font-semibold text-slate-800">
            Chat Assistant
          </h2>
          {isIndexed && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Active File:{" "}
              <strong className="text-slate-700">{selectedFile?.name}</strong>
            </span>
          )}
        </header>

        {/* Message Stream */}
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
                  <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
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

        {/* Chat Input */}
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
                isIndexed
                  ? "Ask about specs, feature comparison across variants..."
                  : "Upload a document first to start asking questions..."
              }
              disabled={!isIndexed || isLoading}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!isIndexed || isLoading || !inputQuery.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
