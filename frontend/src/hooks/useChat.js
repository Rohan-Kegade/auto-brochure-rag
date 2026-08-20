import { useState } from "react";
import { INITIAL_AI_MESSAGE } from "../constants/config";
import { sendChatMessageApi } from "../api/api";

export function useChat(sessionId, hasActivePdfs) {
  const [messages, setMessages] = useState([INITIAL_AI_MESSAGE]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    if (!hasActivePdfs) {
      alert("Add at least one brochure first.");
      return;
    }

    const userMessage = inputQuery.trim();
    const historyPayload = messages.map((m) => ({ role: m.sender, content: m.text }));

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const data = await sendChatMessageApi(sessionId, userMessage, historyPayload);
      setMessages((prev) => [...prev, { sender: "ai", text: data.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: "ai", text: `**Error:** ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const addSystemNotice = (text) => {
    setMessages((prev) => [...prev, { sender: "ai", text }]);
  };

  const resetChat = () => {
    setMessages([INITIAL_AI_MESSAGE]);
    setInputQuery("");
  };

  return {
    messages,
    inputQuery,
    isLoading,
    setInputQuery,
    sendMessage,
    addSystemNotice,
    resetChat,
  };
}