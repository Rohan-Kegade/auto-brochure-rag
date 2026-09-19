import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";

// How close to the bottom (px) still counts as "following" the conversation.
const STICK_THRESHOLD = 80;

export function MessageList({ messages, isLoading }) {
  const chatEndRef = useRef(null);
  const containerRef = useRef(null);
  const stickRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
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
      className="flex-1 overflow-y-auto p-6 space-y-4"
    >
      {messages.map((msg) => (
        <ChatMessage key={msg.key ?? msg.id} message={msg} />
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
  );
}
