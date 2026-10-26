import { useState } from "react";
import { Send } from "lucide-react";

export function ChatInput({
  inputQuery,
  hasActivePdfs,
  activePdfCount,
  isLoadingDocuments,
  isLoading,
  onInputChange,
  onSubmit,
}) {
  // While a switched-to chat's brochures load, keep showing the last known state
  // instead of flashing the disabled "add a brochure" input in between.
  const [settledCount, setSettledCount] = useState(activePdfCount);
  if (!isLoadingDocuments && settledCount !== activePdfCount) {
    setSettledCount(activePdfCount);
  }
  const pdfCount = isLoadingDocuments ? settledCount : activePdfCount;
  const hasPdfs = isLoadingDocuments ? settledCount > 0 : hasActivePdfs;

  const getPlaceholder = () => {
    if (!hasPdfs) return "Add a brochure to start chatting...";
    return pdfCount === 1
      ? "Ask anything about this brochure..."
      : "Ask about features, specs or compare these brochures...";
  };

  return (
    <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
      <form onSubmit={onSubmit} className="max-w-4xl mx-auto flex gap-2 sm:gap-3">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={!hasPdfs || isLoading}
          className="flex-1 min-w-0 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!hasPdfs || isLoading || !inputQuery.trim()}
          className="px-3.5 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <span className="hidden sm:inline">Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
