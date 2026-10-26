import { useRef, useLayoutEffect } from "react";
import { ChatMessage } from "./ChatMessage";

// How close to the bottom (px) still counts as "following" the conversation.
const STICK_THRESHOLD = 80;

export function MessageList({ messages, isLoading, onRetry }) {
  const chatEndRef = useRef(null);
  const containerRef = useRef(null);
  const stickRef = useRef(true);
  const prevCountRef = useRef(0);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
  };

  // Layout effect so an opened chat paints already scrolled to the bottom.
  useLayoutEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = messages.length;
    const last = messages[messages.length - 1];
    // A chat's history just loaded: jump straight to the latest message
    // instead of visibly scrolling down from the top.
    if (prevCount === 0 && messages.length > 0) {
      stickRef.current = true;
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      return;
    }
    // Sending a message always jumps to it; otherwise don't drag the user back
    // down if they scrolled up to read.
    if (last?.sender === "user") stickRef.current = true;
    if (!stickRef.current) return;
    // Smooth scrolling can't keep up with a streaming answer growing token by token.
    const streaming = last?.streaming;
    chatEndRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth" });
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-6 px-4 sm:px-10 lg:px-20"
    >
      <div className="max-w-6xl mx-auto space-y-4">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.key ?? msg.id}
            message={msg}
            onRetry={msg.failed && i === messages.length - 1 ? onRetry : undefined}
          />
        ))}

        {isLoading && !messages[messages.length - 1]?.streaming && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none text-slate-400 text-sm flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
