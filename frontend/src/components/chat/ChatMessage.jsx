import { memo } from "react";
import { RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Memoised so a streaming answer doesn't re-render (and re-parse) every earlier message.
// `onRetry` is given only to a failed question that can be retried (the latest one).
export const ChatMessage = memo(function ChatMessage({ message, onRetry }) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
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
      {message.failed && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-red-500">
          <span>Not answered</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
});
