import { useState } from "react";
import { ArrowUp, Square } from "lucide-react";

export function ChatInput({
  inputQuery,
  hasActivePdfs,
  activePdfCount,
  isLoadingDocuments,
  isLoading,
  canStop,
  onInputChange,
  onSubmit,
  onStop,
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

  const sendClasses =
    "w-10 h-10 shrink-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/25 transition-colors disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

  return (
    <div className="relative px-3 sm:px-6 pb-3 sm:pb-4 pt-1">
      {/* fades messages out as they scroll under the composer */}
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-slate-50 to-transparent" aria-hidden="true" />
      <form onSubmit={onSubmit} className="max-w-4xl mx-auto">
        <div className="composer flex items-center gap-2 p-1.5 pl-4 bg-white border border-slate-200 rounded-2xl shadow-lg shadow-indigo-900/5 transition-[border-color,box-shadow] has-[input:disabled]:bg-slate-50 has-[input:disabled]:shadow-none">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={!hasPdfs || isLoading}
            aria-label="Your question"
            className="flex-1 min-w-0 py-2 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop"
              aria-label="Stop response"
              disabled={!canStop}
              className={sendClasses}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              title="Send"
              aria-label="Send"
              disabled={!hasPdfs || isLoading || !inputQuery.trim()}
              className={sendClasses}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
