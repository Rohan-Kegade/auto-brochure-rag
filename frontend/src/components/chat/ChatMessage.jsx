import { memo } from "react";
import { RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Logo } from "../common/Logo";
import { CopyButton } from "./CopyButton";
import { MessageSources } from "./MessageSources";

// Memoised so a streaming answer doesn't re-render (and re-parse) every earlier message,
// so `onRetry(message)` must be stable. `canRetry` is false while an answer is streaming.
export const ChatMessage = memo(function ChatMessage({ message, canRetry, onRetry }) {
  const isUser = message.sender === "user";
  const retry = () => onRetry(message);
  // Pointer devices reveal the actions on hover; touch screens always show them.
  const reveal = "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100";

  return (
    <div className={`group flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-[fadeIn_0.25s_ease-out]`}>
      {!isUser && <Logo className="hidden sm:block w-8 h-8 mt-0.5" />}

      <div className={`min-w-0 flex flex-col ${isUser ? "items-end max-w-[88%] sm:max-w-[75%]" : "items-start flex-1"}`}>
        <div
          className={`max-w-full min-w-0 wrap-break-word text-[13px] leading-relaxed ${
            isUser
              ? "px-4 py-2.5 bg-linear-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-br-md shadow-md shadow-indigo-600/15"
              : "w-full px-4 sm:px-5 py-4 bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-md shadow-xs overflow-hidden"
          }`}
        >
          {!isUser ? (
            <div
              className={`prose prose-slate dark:prose-invert prose-sm text-[13px]! max-w-none prose-strong:text-slate-900 prose-headings:font-display prose-headings:tracking-tight ${
                message.streaming ? "answer-streaming" : ""
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-3 border border-slate-200 rounded-xl">
                      <table
                        className="min-w-full divide-y divide-slate-200 text-[11px] text-left m-0"
                        {...props}
                      />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead
                      className="bg-indigo-50 font-semibold text-slate-700"
                      {...props}
                    />
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="px-3 py-2 border-b border-slate-200 font-semibold text-slate-900 whitespace-nowrap uppercase tracking-wider text-[10px]"
                      {...props}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td
                      className="px-3 py-2 border-b border-slate-100 border-r last:border-r-0 whitespace-nowrap bg-white tabular-nums"
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
          {/* Shown once the answer is complete; a stopped answer has none. */}
          {!isUser && !message.streaming && message.sources?.length > 0 && (
            <MessageSources sources={message.sources} />
          )}
        </div>

        <div
          className={`mt-1 min-h-6 flex items-center gap-2 text-[11px] ${isUser ? "flex-row-reverse" : ""}`}
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
          {message.stopped && !message.failed && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">Stopped</span>
          )}
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
    </div>
  );
});
