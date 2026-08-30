import { Send } from "lucide-react";

export function ChatInput({
  inputQuery,
  hasActivePdfs,
  activePdfCount,
  isLoading,
  onInputChange,
  onSubmit,
}) {
  const getPlaceholder = () => {
    if (!hasActivePdfs) return "Add a brochure to start chatting...";
    return activePdfCount === 1
      ? "Ask anything about this brochure..."
      : "Ask about features, specs or compare these brochures...";
  };

  return (
    <div className="p-4 bg-white border-t border-slate-200">
      <form onSubmit={onSubmit} className="max-w-4xl mx-auto flex gap-3">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={getPlaceholder()}
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
  );
}
