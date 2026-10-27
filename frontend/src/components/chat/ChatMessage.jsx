import { memo } from "react";
import { RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./CopyButton";

// Memoised so a streaming answer doesn't re-render (and re-parse) every earlier message,
// so `onRetry(message)` must be stable. `canRetry` is false while an answer is streaming.
export const ChatMessage = memo(function ChatMessage({ message, canRetry, onRetry }) {
  const isUser = message.sender === "user";
  const retry = () => onRetry(message);
  // Pointer devices reveal the actions on hover; touch screens always show them.
  const reveal = "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100";

  return (
    <div className={`group flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-full lg:max-w-4xl min-w-0 wrap-break-word px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-xs ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-none"
            : "bg-white text-slate-800 border border-slate-200 rounded-bl-none overflow-hidden"
        }`}
      >
        {!isUser ? (
          <div className="prose prose-slate dark:prose-invert prose-sm text-[13px]! max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-3 border border-slate-200 rounded-lg shadow-xs">
                    <table
                      className="min-w-full divide-y divide-slate-200 text-[11px] text-left m-0"
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
              {message.text}
            </ReactMarkdown>
          </div>
        ) : (
          message.text
        )}
      </div>
      <div
        className={`mt-1 flex items-center gap-2 text-[11px] ${isUser ? "flex-row-reverse" : ""}`}
      >
        {!message.streaming && message.text && <CopyButton text={message.text} className={reveal} />}
        {!message.streaming && !message.failed && canRetry && (
          <button
            type="button"
            onClick={retry}
            title={isUser ? "Ask again" : "Regenerate response"}
            aria-label={isUser ? "Ask again" : "Regenerate response"}
            className={`p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer transition-opacity ${reveal}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        {message.stopped && !message.failed && <span className="text-slate-400">Stopped</span>}
        {message.failed && (
          <div className="flex items-center gap-2 text-red-500">
            <span>{message.stopped ? "Stopped" : "Not answered"}</span>
            {canRetry && (
              <button
                type="button"
                onClick={retry}
                className="flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
