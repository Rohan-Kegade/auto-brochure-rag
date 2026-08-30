import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatMessage({ message }) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-4xl px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-none"
            : "bg-white text-slate-800 border border-slate-200 rounded-bl-none overflow-hidden"
        }`}
      >
        {!isUser ? (
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
              {message.text}
            </ReactMarkdown>
          </div>
        ) : (
          message.text
        )}
      </div>
    </div>
  );
}
