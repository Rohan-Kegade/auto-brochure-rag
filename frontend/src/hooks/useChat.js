import { useState } from "react";
import { INITIAL_AI_MESSAGE } from "../constants/config";
import { sendChatMessageApi } from "../api/api";
import { getErrorMessage } from "../utils/errors";
import { toast } from "sonner";

export function useChat(hasActivePdfs) {
  const [messages, setMessages] = useState([INITIAL_AI_MESSAGE]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    if (!hasActivePdfs) {
      toast.warning("Please upload at least one brochure first.");
      return;
    }

    const userMessage = inputQuery.trim();
    const historyPayload = messages.map((m) => ({
      role: m.sender,
      content: m.text,
    }));

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const data = await sendChatMessageApi(userMessage, historyPayload);
      setMessages((prev) => [...prev, { sender: "ai", text: data.answer }]);
    } catch (err) {
      const message = getErrorMessage(err, "Unable to get a response.");
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: `**Error:** ${message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const addSystemNotice = (text) => {
    setMessages((prev) => [...prev, { sender: "ai", text }]);
  };

  return {
    messages,
    inputQuery,
    isLoading,
    setInputQuery,
    sendMessage,
    addSystemNotice,
  };
}
