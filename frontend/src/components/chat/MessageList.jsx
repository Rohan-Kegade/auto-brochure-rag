import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScanText } from "lucide-react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Logo } from "../common/Logo";
import { ChatMessage } from "./ChatMessage";

// How close to the bottom (px) still counts as "following" the conversation.
const STICK_THRESHOLD = 80;

export function MessageList({ messages, isLoading, canRetry, onRetry }) {
  const chatEndRef = useRef(null);
  const containerRef = useRef(null);
  const stickRef = useRef(true);
  const prevCountRef = useRef(0);
  // A retry that would also delete later messages waits here for confirmation.
  const [pendingRetry, setPendingRetry] = useState(null);

  // Read through a ref so `requestRetry` stays stable while an answer streams.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const requestRetry = useCallback(
    (message) => {
      const list = messagesRef.current;
      let index = list.findIndex((m) => m.id === message.id);
      if (list[index]?.sender === "ai") index -= 1;
      // Beyond the question's own answer, would anything else be deleted?
      const kept = list[index + 1]?.sender === "ai" ? index + 2 : index + 1;
      const later = list.length - kept;
      if (later > 0) setPendingRetry({ id: message.id, later });
      else onRetry(message.id);
    },
    [onRetry],
  );

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
      className="flex-1 overflow-y-auto pt-6 pb-4 px-4 sm:px-8 lg:px-12"
    >
      <div className="max-w-4xl mx-auto space-y-5">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.key ?? msg.id}
            message={msg}
            canRetry={canRetry && !msg.id.startsWith("pending-")}
            onRetry={requestRetry}
          />
        ))}

        {isLoading && !messages[messages.length - 1]?.streaming && (
          // Until the first token: a beam sweeps the card while the brochures are searched.
          <div className="flex gap-3 animate-[fadeIn_0.2s_ease-out]" role="status">
            <Logo className="hidden sm:block w-8 h-8 mt-0.5" />
            <div className="reading-card relative overflow-hidden px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-md shadow-xs flex items-center gap-2.5 text-sm">
              <ScanText className="w-4 h-4 text-indigo-500" />
              <span className="shimmer-text">Reading your brochures…</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {pendingRetry && (
        <ConfirmDialog
          title="Answer this again?"
          description={`The ${pendingRetry.later === 1 ? "message" : `${pendingRetry.later} messages`} after it will be permanently deleted.`}
          confirmLabel="Delete and retry"
          onConfirm={() => onRetry(pendingRetry.id)}
          onClose={() => setPendingRetry(null)}
        />
      )}
    </div>
  );
}
